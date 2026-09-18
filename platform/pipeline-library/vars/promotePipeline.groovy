import com.platform.ProjectRegistry
import com.platform.DockerImage

def call(Map config = [:]) {

    def dockerImage = new DockerImage(this)

    String agentLabel = config.get('agentLabel', 'executor-cluster-local')
    String defaultProject = config.get('project', '')
    String defaultService = config.get('service', '')
    int timeoutMinutes = config.get('timeoutMinutes', 20)
    int buildsToKeep = config.get('buildsToKeep', 30)

    String project = ''
    String sourceTag = ''
    String targetTag = ''
    String registryHost = ''
    String credentialsId = ''
    String registryType = ''
    String awsRegion = ''
    String awsCredentialsId = ''
    boolean insecure = false
    def plan = []

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
                name: 'SOURCE_TAG',
                defaultValue: '',
                description: 'Immutable tag produced by ciPipeline, for example a1b2c3d.'
            )
            string(
                name: 'TARGET_TAG',
                defaultValue: '',
                description: 'Pointer tag to move, for example staging or prod.'
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
                        sourceTag = params.SOURCE_TAG?.trim()
                        targetTag = params.TARGET_TAG?.trim()

                        if (!project) {
                            error 'PROJECT is required'
                        }
                        if (!sourceTag) {
                            error 'SOURCE_TAG is required'
                        }
                        if (!targetTag) {
                            error 'TARGET_TAG is required'
                        }
                        if (sourceTag == targetTag) {
                            error 'SOURCE_TAG and TARGET_TAG must differ'
                        }

                        def registry = ProjectRegistry.load()
                        plan = ProjectRegistry.buildPlan(registry, project, params.SERVICE)
                        registryHost = ProjectRegistry.registryHost(registry, project)
                        credentialsId = ProjectRegistry.credentialsId(registry, project)
                        registryType = ProjectRegistry.registryType(registry, project)
                        awsRegion = ProjectRegistry.awsRegion(registry, project)
                        awsCredentialsId = ProjectRegistry.awsCredentialsId(registry, project)
                        insecure = ProjectRegistry.insecureRegistry(registry, project)

                        currentBuild.displayName = "#${BUILD_NUMBER} ${project} ${sourceTag} to ${targetTag}"
                        echo "project    : ${project}"
                        echo "registry   : ${registryHost}"
                        echo "source tag : ${sourceTag}"
                        echo "target tag : ${targetTag}"
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
                            dockerImage.loginEcrPublic(awsRegion, awsCredentialsId)
                        } else {
                            dockerImage.login(registryHost, credentialsId)
                        }
                    }
                }
            }

            stage('Verify source tag') {
                steps {
                    script {
                        def missing = []
                        for (unit in plan) {
                            if (!dockerImage.exists(unit.image, sourceTag, insecure)) {
                                missing.add("${unit.image}:${sourceTag}")
                            }
                        }
                        for (item in missing) {
                            echo "not found in registry: ${item}"
                        }
                        if (missing) {
                            error "source tag missing for ${missing.size()} image(s)"
                        }
                        echo "source tag present for all ${plan.size()} image(s)"
                    }
                }
            }

            stage('Promote') {
                steps {
                    script {
                        for (unit in plan) {
                            dockerImage.pull(unit.image, sourceTag)
                            dockerImage.retag(unit.image, sourceTag, targetTag)
                            dockerImage.push(unit.image, targetTag)
                        }
                    }
                }
            }

            stage('Verify same content') {
                steps {
                    script {
                        def mismatched = []
                        for (unit in plan) {
                            def source = dockerImage.manifest(unit.image, sourceTag, insecure)
                            def target = dockerImage.manifest(unit.image, targetTag, insecure)
                            if (source != target) {
                                mismatched.add(unit.image)
                            }
                        }
                        for (item in mismatched) {
                            echo "manifest differs between tags: ${item}"
                        }
                        if (mismatched) {
                            error "promotion changed content for ${mismatched.size()} image(s)"
                        }
                        echo "${targetTag} points at the same content as ${sourceTag} for all images"
                    }
                }
            }

            stage('Report') {
                steps {
                    script {
                        def lines = ["project=${project}", "source=${sourceTag}", "target=${targetTag}"]
                        for (unit in plan) {
                            lines.add("${unit.image}:${targetTag}")
                        }
                        writeFile file: 'target/promoted-images.txt', text: lines.join('\n')
                        echo lines.join('\n')
                    }
                }
            }
        }

        post {
            always {
                archiveArtifacts artifacts: 'target/promoted-images.txt', allowEmptyArchive: true
            }
            cleanup {
                script {
                    for (unit in plan) {
                        dockerImage.remove(unit.image, targetTag)
                        dockerImage.remove(unit.image, sourceTag)
                    }
                    deleteDir()
                }
            }
        }
    }
}
