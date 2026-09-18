def libraryRepo = env.PLATFORM_LIB_REPO ?: 'https://github.com/lyduchuy1204/containerized-cicd-platform.git'
def libraryVersion = env.PLATFORM_LIB_VERSION ?: 'main'
def libraryPath = env.PLATFORM_LIB_PATH ?: 'platform/pipeline-library'

library identifier: "platform@${libraryVersion}", retriever: modernSCM(
    scm: [
        $class: 'GitSCMSource',
        remote: libraryRepo,
        traits: [gitBranchDiscovery()]
    ],
    libraryPath: libraryPath
)

cdPipeline(
    project: 'product-media',
    environment: 'dev',
    service: 'worker',
    agentLabel: env.PLATFORM_AGENT_LABEL ?: 'executor-cluster-local'
)
