def login(String registryHost, String credentialsId) {
    withCredentials([usernamePassword(credentialsId: credentialsId, usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASS')]) {
        sh "echo \$REGISTRY_PASS | docker login ${registryHost} --username \$REGISTRY_USER --password-stdin"
    }
}

def build(String image, String tag, String context) {
    sh "docker build -t ${image}:${tag} ${context}"
}

def push(String image, String tag) {
    sh "docker push ${image}:${tag}"
}

def pull(String image, String tag) {
    sh "docker pull ${image}:${tag}"
}

def pullByDigest(String image, String digest) {
    sh "docker pull ${image}@${digest}"
}

def retagFromDigest(String image, String digest, String targetTag) {
    sh "docker tag ${image}@${digest} ${image}:${targetTag}"
}

def retag(String image, String sourceTag, String targetTag) {
    sh "docker tag ${image}:${sourceTag} ${image}:${targetTag}"
}

def remove(String image, String tag) {
    sh(script: "docker rmi ${image}:${tag}", returnStatus: true)
}

def exists(String image, String tag, boolean insecure = false) {
    return sh(script: "docker manifest inspect ${flag(insecure)} ${image}:${tag}", returnStatus: true) == 0
}

def manifest(String image, String tag, boolean insecure = false) {
    return sh(script: "docker manifest inspect ${flag(insecure)} ${image}:${tag}", returnStdout: true).trim()
}

def flag(boolean insecure) {
    return insecure ? '--insecure' : ''
}
