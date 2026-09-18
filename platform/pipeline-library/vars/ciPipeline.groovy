import com.platform.ProjectRegistry
import com.platform.DockerImage
import com.platform.SourceCheckout

def call(Map config = [:]) {

    def dockerImage = new DockerImage(this)
    def sourceCheckout = new SourceCheckout(this)

    String agentLabel = config.get('agentLabel', 'executor-cluster-local')
    String defaultProject = config.get('project', '')
    String defaultService = config.get('service', '')
    int timeoutMinutes = config.get('timeoutMinutes', 60)
    int buildsToKeep = config.get('buildsToKeep', 30)

    String project = ''
    String tag = ''
    String pointerTag = ''
    String registryHost = ''
    String credentialsId = ''
    String registryType = ''
    String awsRegion = ''
    def plan = []
    def sourceCommits = [:]

    pipeline {

        agent {
            label agentLabel
        }

        parameters {
            string(
                name: 'PROJECT',
                defaultValue: defaultProject,
                description: 'Project declared in the platform registry.'
            )
            string(
                name: 'SERVICE',
                defaultValue: defaultService,
                description: 'Service of the project. Leave empty to act on every service.'
            )
            string(
                name: 'POINTER_TAG',
                defaultValue: 'dev',
                description: 'Environment pointer tag moved to this build. The immutable commit tag is always pushed as well.'
            )
            booleanParam(
                name: 'PUSH',
                defaultValue: true,
                description: 'Push the built images to the registry.'
            )
        }

        options {
            timeout(time: timeoutMinutes, unit: 'MINUTES')
            timestamps()
            disableConcurrentBuilds()
            buildDiscarder(logRotator(numToKeepStr: "${buildsToKeep}"))
        }

        stages {

            stage('Checkout') {
                steps {
                    checkout scm
                }
            }

            stage('Resolve scope') {
                steps {
                    script {
                        project = params.PROJECT?.trim()
                        if (!project) {
                            error 'PROJECT is required'
                        }

                        def registry = ProjectRegistry.load()
                        plan = ProjectRegistry.buildPlan(registry, project, params.SERVICE)
                        registryHost = ProjectRegistry.registryHost(registry, project)
                        credentialsId = ProjectRegistry.credentialsId(registry, project)
                        registryType = ProjectRegistry.registryType(registry, project)
                        awsRegion = ProjectRegistry.awsRegion(registry, project)
                        tag = "b${BUILD_NUMBER}"
                        pointerTag = params.POINTER_TAG?.trim()

                        currentBuild.displayName = "#${BUILD_NUMBER} ${project} ${tag}"
                        echo "project     : ${project}"
                        echo "registry    : ${registryHost}"
                        echo "build tag   : ${tag}"
                        echo "pointer tag : ${pointerTag}"
                        for (unit in plan) {
                            echo "service     : ${unit.service} <- ${unit.repo} ref ${unit.ref}"
                        }
                    }
                }
            }

            stage('Registry login') {
                when {
                    expression { registryType == 'ecr-public' || credentialsId }
                }
                steps {
                    script {
                        if (registryType == 'ecr-public') {
                            dockerImage.loginEcrPublic(awsRegion)
                        } else {
                            dockerImage.login(registryHost, credentialsId)
                        }
                    }
                }
            }

            stage('Checkout application sources') {
                steps {
                    script {
                        sourceCommits = sourceCheckout.cloneAll(plan)
                    }
                }
            }

            stage('Build images') {
                steps {
                    script {
                        def builds = [:]
                        for (item in plan) {
                            def unit = item
                            builds[unit.service] = {
                                dockerImage.build(unit.image, tag, unit.context)
                            }
                        }
                        parallel builds
                    }
                }
            }

            stage('Push commit tag') {
                when {
                    expression { params.PUSH }
                }
                steps {
                    script {
                        for (unit in plan) {
                            dockerImage.push(unit.image, tag)
                        }
                    }
                }
            }

            stage('Move pointer tag') {
                when {
                    expression { params.PUSH && pointerTag }
                }
                steps {
                    script {
                        for (unit in plan) {
                            dockerImage.retag(unit.image, tag, pointerTag)
                            dockerImage.push(unit.image, pointerTag)
                        }
                    }
                }
            }

            stage('Report') {
                steps {
                    script {
                        def lines = ["project=${project}", "build_tag=${tag}", "pointer_tag=${pointerTag}"]
                        for (unit in plan) {
                            lines.add("${unit.image}:${tag} source=${unit.repo}@${sourceCommits[unit.service]}")
                        }
                        writeFile file: 'target/ci-images.txt', text: lines.join('\n')
                        echo lines.join('\n')
                    }
                }
            }
        }

        post {
            always {
                archiveArtifacts artifacts: 'target/ci-images.txt', allowEmptyArchive: true
            }
            cleanup {
                deleteDir()
            }
        }
    }
}
