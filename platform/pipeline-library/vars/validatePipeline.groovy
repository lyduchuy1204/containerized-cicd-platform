import com.platform.ProjectRegistry
import com.platform.ManifestPolicy
import com.platform.Kubectl
import com.platform.Shell

def call(Map config = [:]) {

    def kubectl = new Kubectl(this)
    def shell = new Shell(this)

    String agentLabel = config.get('agentLabel', 'executor-cluster-local')
    String renderDir = config.get('renderDir', 'target/rendered')
    String defaultProject = config.get('project', '')
    boolean defaultDryRun = config.get('serverDryRun', true)
    int timeoutMinutes = config.get('timeoutMinutes', 15)
    int buildsToKeep = config.get('buildsToKeep', 20)

    String lintScript = config.get('lintScript', 'scripts/validate-groovy.py')
    String lintCredentialsId = config.get('lintCredentialsId', 'validate')
    String jenkinsUrl = config.get('jenkinsUrl', 'http://127.0.0.1')
    String jenkinsUser = config.get('jenkinsUser', 'admin')
    String pythonCommand = config.get('pythonCommand', 'python')
    boolean lintStrict = config.get('lintStrict', false)

    def overlays = []
    def namespaces = []

    pipeline {

        agent {
            label agentLabel
        }

        parameters {
            string(
                name: 'PROJECT',
                defaultValue: defaultProject,
                description: 'Project to validate. Leave empty to validate every project declared in the registry.'
            )
            booleanParam(
                name: 'SERVER_DRY_RUN',
                defaultValue: defaultDryRun,
                description: 'Send the rendered manifests to the API server with --dry-run=server. Turn off when no cluster is reachable.'
            )
            booleanParam(
                name: 'LINT_PIPELINES',
                defaultValue: true,
                description: 'Send the pipeline files to the Jenkins declarative linter.'
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
                        def registry = ProjectRegistry.load()
                        def selected = ProjectRegistry.selectedProjects(registry, params.PROJECT)
                        overlays = ProjectRegistry.overlayPaths(registry, params.PROJECT)
                        namespaces = ProjectRegistry.namespaces(registry, params.PROJECT)

                        currentBuild.displayName = "#${BUILD_NUMBER} ${selected.join(' ')}"
                        echo "projects      : ${selected.join(', ')}"
                        echo "overlays      : ${overlays.join(', ')}"
                        echo "namespaces    : ${namespaces.join(', ')}"
                        echo "server dry run: ${params.SERVER_DRY_RUN}"

                        if (!overlays) {
                            error 'no overlay resolved from the registry'
                        }
                    }
                }
            }

            stage('Lint pipeline files') {
                when {
                    expression { params.LINT_PIPELINES }
                }
                steps {
                    script {
                        withCredentials([string(credentialsId: lintCredentialsId, variable: 'JENKINS_TOKEN')]) {
                            withEnv(["JENKINS_URL=${jenkinsUrl}", "JENKINS_USER=${jenkinsUser}"]) {
                                def code = shell.status("${pythonCommand} ${lintScript}")
                                if (code != 0 && lintStrict) {
                                    error "declarative linter reported problems, exit code ${code}"
                                }
                                if (code != 0) {
                                    unstable "declarative linter reported problems, exit code ${code}"
                                }
                            }
                        }
                    }
                }
            }

            stage('Render overlays') {
                steps {
                    script {
                        for (overlay in overlays) {
                            writeFile file: renderedFile(renderDir, overlay), text: kubectl.render(overlay)
                            echo "rendered ${overlay}"
                        }
                    }
                }
            }

            stage('Check conventions') {
                steps {
                    script {
                        def failures = []
                        for (overlay in overlays) {
                            def rendered = readFile(file: renderedFile(renderDir, overlay))
                            for (violation in ManifestPolicy.violations(rendered)) {
                                failures.add("${overlay}: ${violation}")
                            }
                        }
                        for (failure in failures) {
                            echo failure
                        }
                        if (failures) {
                            error "manifest policy violations: ${failures.size()}"
                        }
                        echo "all ${overlays.size()} overlays satisfy the manifest policy"
                    }
                }
            }

            stage('Ensure namespaces') {
                when {
                    expression { params.SERVER_DRY_RUN }
                }
                steps {
                    script {
                        for (namespace in namespaces) {
                            kubectl.ensureNamespace(namespace)
                        }
                    }
                }
            }

            stage('Server dry run') {
                when {
                    expression { params.SERVER_DRY_RUN }
                }
                steps {
                    script {
                        for (overlay in overlays) {
                            kubectl.dryRun(overlay)
                        }
                    }
                }
            }
        }

        post {
            always {
                archiveArtifacts artifacts: "${renderDir}/*.yaml", allowEmptyArchive: true
            }
            cleanup {
                deleteDir()
            }
        }
    }
}

def renderedFile(String renderDir, String overlayPath) {
    return "${renderDir}/${overlayPath.replace('/', '_')}.yaml"
}
