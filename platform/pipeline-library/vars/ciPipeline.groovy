def call(Map config = [:]) {

    String agentLabel = config.get('agentLabel', 'linux')
    String registryFile = config.get('registryFile', 'platform/projects.yaml')
    String defaultProject = config.get('project', '')
    int timeoutMinutes = config.get('timeoutMinutes', 60)
    int buildsToKeep = config.get('buildsToKeep', 30)

    String project = ''
    String tag = ''
    String pointerTag = ''
    String registryHost = ''
    String credentialsId = ''
    def plan = []

    pipeline {

        agent {
            label agentLabel
        }

        parameters {
            string(
                name: 'PROJECT',
                defaultValue: defaultProject,
                description: 'Project declared in platform/projects.yaml.'
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

                        def registry = projectRegistry.load(registryFile)
                        plan = projectRegistry.buildPlan(registry, project)
                        registryHost = projectRegistry.registryHost(registry, project)
                        credentialsId = projectRegistry.credentialsId(registry, project)
                        tag = imageTag.commit()
                        pointerTag = params.POINTER_TAG?.trim()

                        currentBuild.displayName = "#${BUILD_NUMBER} ${project} ${tag}"
                        echo "project     : ${project}"
                        echo "registry    : ${registryHost}"
                        echo "commit tag  : ${tag}"
                        echo "pointer tag : ${pointerTag}"
                        for (unit in plan) {
                            echo "service  : ${unit.service} -> ${unit.image}:${tag} from ${unit.context}"
                        }
                    }
                }
            }

            stage('Registry login') {
                when {
                    expression { credentialsId }
                }
                steps {
                    script {
                        dockerImage.login(registryHost, credentialsId)
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
                        def lines = ["project=${project}", "commit_tag=${tag}", "pointer_tag=${pointerTag}"]
                        for (unit in plan) {
                            lines.add("${unit.image}:${tag}")
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
