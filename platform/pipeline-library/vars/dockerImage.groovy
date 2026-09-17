def login(String registryHost, String credentialsId) {
    withCredentials([usernamePassword(credentialsId: credentialsId, usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASS')]) {
        if (isUnix()) {
            sh 'echo $REGISTRY_PASS | docker login ' + registryHost + ' --username $REGISTRY_USER --password-stdin'
        } else {
            bat "@echo %REGISTRY_PASS% | docker login ${registryHost} --username %REGISTRY_USER% --password-stdin"
        }
    }
}

def build(String image, String tag, String context) {
    shell.run("docker build -t ${image}:${tag} ${context}")
}

def push(String image, String tag) {
    shell.run("docker push ${image}:${tag}")
}

def pull(String image, String tag) {
    shell.run("docker pull ${image}:${tag}")
}

def pullByDigest(String image, String digest) {
    shell.run("docker pull ${image}@${digest}")
}

def retag(String image, String sourceTag, String targetTag) {
    shell.run("docker tag ${image}:${sourceTag} ${image}:${targetTag}")
}

def retagFromDigest(String image, String digest, String targetTag) {
    shell.run("docker tag ${image}@${digest} ${image}:${targetTag}")
}

def remove(String image, String tag) {
    shell.status("docker rmi ${image}:${tag}")
}

def exists(String image, String tag, boolean insecure = false) {
    return shell.status("docker manifest inspect ${flag(insecure)} ${image}:${tag}") == 0
}

def manifest(String image, String tag, boolean insecure = false) {
    return shell.capture("docker manifest inspect ${flag(insecure)} ${image}:${tag}")
}

def flag(boolean insecure) {
    return insecure ? '--insecure' : ''
}
