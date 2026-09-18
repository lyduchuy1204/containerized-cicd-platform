import com.platform.ProjectRegistry

def call(Map config = [:]) {

    String agentLabel = config.get('agentLabel', 'executor-cluster-local')
    String project = config.get('project', '')
    String service = config.get('service', '')
    String validateJob = config.get('validateJob', 'platform-validate')
    int timeoutMinutes = config.get('timeoutMinutes', 120)
    int buildsToKeep = config.get('buildsToKeep', 30)

    if (!project || !service) {
        error 'project va service la bat buoc trong config cua servicePipeline'
    }

    String prefix = "${project}-${service}"
    String buildTag = ''

    pipeline {

        agent {
            label agentLabel
        }

        parameters {
            booleanParam(
                name: 'RUN_VALIDATE',
                defaultValue: true,
                description: 'Run the platform validate job before building.'
            )
            booleanParam(
                name: 'DEPLOY_STAGING',
                defaultValue: true,
                description: 'Promote to staging and deploy staging after dev succeeds.'
            )
            booleanParam(
                name: 'DEPLOY_PROD',
                defaultValue: false,
                description: 'Ask for approval, then promote to prod and deploy prod.'
            )
        }

        options {
            timeout(time: timeoutMinutes, unit: 'MINUTES')
            timestamps()
            disableConcurrentBuilds()
            buildDiscarder(logRotator(numToKeepStr: "${buildsToKeep}"))
        }

        stages {

            stage('Resolve scope') {
                steps {
                    script {
                        def registry = ProjectRegistry.load()
                        ProjectRegistry.buildPlan(registry, project, service)
                        if (ProjectRegistry.jobPrefix(registry, project, service) != prefix) {
                            error "job prefix khong khop registry: ${prefix}"
                        }

                        currentBuild.displayName = "#${BUILD_NUMBER} ${prefix}"
                        echo "project     : ${project}"
                        echo "service     : ${service}"
                        echo "job prefix  : ${prefix}"
                    }
                }
            }

            stage('Validate') {
                when {
                    expression { params.RUN_VALIDATE }
                }
                steps {
                    script {
                        build job: validateJob, wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            booleanParam(name: 'SERVER_DRY_RUN', value: true)
                        ]
                    }
                }
            }

            stage('CI') {
                steps {
                    script {
                        def run = build job: "${prefix}-ci", wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            string(name: 'SERVICE', value: service),
                            string(name: 'POINTER_TAG', value: 'dev'),
                            booleanParam(name: 'PUSH', value: true)
                        ]
                        buildTag = "b${run.number}"
                        echo "build tag tu CI: ${buildTag}"
                    }
                }
            }

            stage('Deploy dev') {
                steps {
                    script {
                        build job: "${prefix}-cd", wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            string(name: 'SERVICE', value: service),
                            string(name: 'ENVIRONMENT', value: 'dev'),
                            booleanParam(name: 'AUTO_ROLLBACK', value: true)
                        ]
                    }
                }
            }

            stage('Promote staging') {
                when {
                    expression { params.DEPLOY_STAGING }
                }
                steps {
                    script {
                        if (!buildTag) {
                            error 'buildTag trong, hay chay lai tu dau thay vi restart tu stage promote'
                        }
                        build job: "${prefix}-promote", wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            string(name: 'SERVICE', value: service),
                            string(name: 'SOURCE_TAG', value: buildTag),
                            string(name: 'TARGET_TAG', value: 'staging')
                        ]
                    }
                }
            }

            stage('Deploy staging') {
                when {
                    expression { params.DEPLOY_STAGING }
                }
                steps {
                    script {
                        build job: "${prefix}-cd", wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            string(name: 'SERVICE', value: service),
                            string(name: 'ENVIRONMENT', value: 'staging'),
                            booleanParam(name: 'AUTO_ROLLBACK', value: true)
                        ]
                    }
                }
            }

            stage('Approve prod') {
                when {
                    expression { params.DEPLOY_PROD }
                }
                steps {
                    input message: "Deploy ${service} ${buildTag} len prod?", ok: 'Deploy'
                }
            }

            stage('Promote prod') {
                when {
                    expression { params.DEPLOY_PROD }
                }
                steps {
                    script {
                        if (!buildTag) {
                            error 'buildTag trong, hay chay lai tu dau thay vi restart tu stage promote'
                        }
                        build job: "${prefix}-promote", wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            string(name: 'SERVICE', value: service),
                            string(name: 'SOURCE_TAG', value: buildTag),
                            string(name: 'TARGET_TAG', value: 'prod')
                        ]
                    }
                }
            }

            stage('Deploy prod') {
                when {
                    expression { params.DEPLOY_PROD }
                }
                steps {
                    script {
                        build job: "${prefix}-cd", wait: true, parameters: [
                            string(name: 'PROJECT', value: project),
                            string(name: 'SERVICE', value: service),
                            string(name: 'ENVIRONMENT', value: 'prod'),
                            booleanParam(name: 'AUTO_ROLLBACK', value: true)
                        ]
                    }
                }
            }
        }

        post {
            success {
                echo "${prefix} hoan tat, build tag ${buildTag}"
            }
        }
    }
}
