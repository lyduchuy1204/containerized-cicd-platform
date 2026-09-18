def call(Map config = [:]) {

    String agentLabel = config.get('agentLabel', 'executor-cluster-local')
    String defaultProject = config.get('project', '')
    String defaultEnvironment = config.get('environment', '')
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

                        def registry = projectRegistry.load()

                        if (!projectRegistry.hasEnvironment(registry, project, environment)) {
                            error "environment ${environment} is not declared for project ${project}"
                        }

                        plan = projectRegistry.buildPlan(registry, project)
                        namespace = projectRegistry.namespace(registry, project, environment)
                        overlay = projectRegistry.overlayPath(registry, project, environment)
                        registryHost = projectRegistry.registryHost(registry, project)
                        credentialsId = projectRegistry.credentialsId(registry, project)
                        migrationJob = projectRegistry.migrationJob(registry, project)
                        smokeCommand = projectRegistry.smokeCommand(registry, project)
                        insecure = projectRegistry.insecureRegistry(registry, project)
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
                    expression { credentialsId }
                }
                steps {
                    script {
                        dockerImage.login(registryHost, credentialsId)
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
                            def digest = k8s.runningDigest(namespace, unit.service)
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
                            k8s.deleteJob(namespace, migrationJob)
                        }
                        k8s.apply(overlay)
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
                            k8s.waitJob(namespace, migrationJob)
                        } catch (error) {
                            k8s.jobLogs(namespace, migrationJob)
                            throw error
                        }
                    }
                }
            }

            stage('Restart and wait workloads') {
                steps {
                    script {
                        for (unit in plan) {
                            k8s.restartRollout(namespace, unit.service)
                        }
                        for (unit in plan) {
                            k8s.waitRollout(namespace, unit.service, rolloutTimeout)
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
                            lines.add("${unit.service}=${k8s.runningDigest(namespace, unit.service)}")
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
