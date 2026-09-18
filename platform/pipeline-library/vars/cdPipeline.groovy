import com.platform.ProjectRegistry
import com.platform.Kubectl
import com.platform.DockerImage
import com.platform.Rollback
import com.platform.Shell

def call(Map config = [:]) {

    def kubectl = new Kubectl(this)
    def dockerImage = new DockerImage(this)
    def rollback = new Rollback(this)
    def shell = new Shell(this)

    String agentLabel = config.get('agentLabel', 'executor-cluster-local')
    String defaultProject = config.get('project', '')
    String defaultEnvironment = config.get('environment', '')
    String defaultService = config.get('service', '')
    String rolloutTimeout = config.get('rolloutTimeout', '5m')
    int timeoutMinutes = config.get('timeoutMinutes', 30)
    int buildsToKeep = config.get('buildsToKeep', 30)

    String project = ''
    String environment = ''
    String namespace = ''
    String overlay = ''
    String tag = ''
    String registryHost = ''
    String credentialsId = ''
    String registryType = ''
    String awsRegion = ''
    String migrationJob = ''
    String smokeCommand = ''
    boolean insecure = false
    def plan = []
    def previousDigests = [:]

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
                name: 'ENVIRONMENT',
                defaultValue: defaultEnvironment,
                description: 'Environment declared for the project, for example dev, staging or prod.'
            )
            booleanParam(
                name: 'AUTO_ROLLBACK',
                defaultValue: true,
                description: 'On failure, move the pointer tag back to the digest that was running before this deploy.'
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
                        environment = params.ENVIRONMENT?.trim()

                        if (!project) {
                            error 'PROJECT is required'
                        }
                        if (!environment) {
                            error 'ENVIRONMENT is required'
                        }

                        def registry = ProjectRegistry.load()

                        if (!ProjectRegistry.hasEnvironment(registry, project, environment)) {
                            error "environment ${environment} is not declared for project ${project}"
                        }

                        plan = ProjectRegistry.buildPlan(registry, project, params.SERVICE)
                        namespace = ProjectRegistry.namespace(registry, project, environment)
                        overlay = ProjectRegistry.overlayPath(registry, project, environment)
                        registryHost = ProjectRegistry.registryHost(registry, project)
                        credentialsId = ProjectRegistry.credentialsId(registry, project)
                        registryType = ProjectRegistry.registryType(registry, project)
                        awsRegion = ProjectRegistry.awsRegion(registry, project)
                        migrationJob = ProjectRegistry.migrationJob(registry, project)
                        String owner = ProjectRegistry.migrationService(registry, project)
                        if (params.SERVICE?.trim() && owner && params.SERVICE.trim() != owner) {
                            migrationJob = ''
                        }
                        smokeCommand = ProjectRegistry.smokeCommand(registry, project)
                        insecure = ProjectRegistry.insecureRegistry(registry, project)
                        tag = environment

                        currentBuild.displayName = "#${BUILD_NUMBER} ${project} ${environment}"
                        echo "project   : ${project}"
                        echo "environment: ${environment}"
                        echo "namespace : ${namespace}"
                        echo "overlay   : ${overlay}"
                        echo "pointer tag: ${tag}"
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

            stage('Verify images') {
                steps {
                    script {
                        def missing = []
                        for (unit in plan) {
                            if (!dockerImage.exists(unit.image, tag, insecure)) {
                                missing.add("${unit.image}:${tag}")
                            }
                        }
                        for (item in missing) {
                            echo "not found in registry: ${item}"
                        }
                        if (missing) {
                            error "pointer tag ${tag} missing for ${missing.size()} image(s)"
                        }
                        echo "pointer tag ${tag} present for all ${plan.size()} image(s)"
                    }
                }
            }

            stage('Capture current state') {
                steps {
                    script {
                        for (unit in plan) {
                            def digest = kubectl.runningDigest(namespace, unit.service)
                            previousDigests[unit.service] = digest
                            echo digest ? "${unit.service} currently runs ${digest}" : "${unit.service} is not running yet"
                        }
                    }
                }
            }

            stage('Apply manifests') {
                steps {
                    script {
                        if (migrationJob) {
                            kubectl.deleteJob(namespace, migrationJob)
                        }
                        kubectl.apply(overlay)
                    }
                }
            }

            stage('Wait migration') {
                when {
                    expression { migrationJob }
                }
                steps {
                    script {
                        try {
                            kubectl.waitJob(namespace, migrationJob)
                        } catch (error) {
                            kubectl.jobLogs(namespace, migrationJob)
                            throw error
                        }
                    }
                }
            }

            stage('Restart and wait workloads') {
                steps {
                    script {
                        for (unit in plan) {
                            kubectl.restartRollout(namespace, unit.service)
                        }
                        for (unit in plan) {
                            kubectl.waitRollout(namespace, unit.service, rolloutTimeout)
                        }
                    }
                }
            }

            stage('Smoke test') {
                when {
                    expression { smokeCommand }
                }
                steps {
                    script {
                        withEnv(["NAMESPACE=${namespace}", "ENVIRONMENT=${environment}", "PROJECT=${project}"]) {
                            shell.run(smokeCommand)
                        }
                    }
                }
            }

            stage('Report') {
                steps {
                    script {
                        def lines = ["project=${project}", "environment=${environment}", "namespace=${namespace}"]
                        for (unit in plan) {
                            lines.add("${unit.service}=${kubectl.runningDigest(namespace, unit.service)}")
                        }
                        writeFile file: 'target/cd-deployed.txt', text: lines.join('\n')
                        echo lines.join('\n')
                    }
                }
            }
        }

        post {
            failure {
                script {
                    if (params.AUTO_ROLLBACK) {
                        rollback.toDigests(namespace, tag, plan, previousDigests)
                    } else {
                        echo 'AUTO_ROLLBACK is off, the environment is left as it is'
                    }
                }
            }
            always {
                archiveArtifacts artifacts: 'target/cd-deployed.txt', allowEmptyArchive: true
            }
            cleanup {
                deleteDir()
            }
        }
    }
}
