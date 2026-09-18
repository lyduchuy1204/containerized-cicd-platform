package com.platform

class DockerImage implements Serializable {

    private final def steps
    private final Shell shell

    DockerImage(def steps) {
        this.steps = steps
        this.shell = new Shell(steps)
    }

    void login(String registryHost, String credentialsId) {
        def binding = steps.usernamePassword(
            credentialsId: credentialsId,
            usernameVariable: 'REGISTRY_USER',
            passwordVariable: 'REGISTRY_PASS'
        )
        steps.withCredentials([binding]) {
            if (steps.isUnix()) {
                steps.sh 'echo $REGISTRY_PASS | docker login ' + registryHost + ' --username $REGISTRY_USER --password-stdin'
            } else {
                steps.bat "@echo %REGISTRY_PASS% | docker login ${registryHost} --username %REGISTRY_USER% --password-stdin"
            }
        }
    }

    void loginEcrPublic(String region, String registryHost = 'public.ecr.aws') {
        if (steps.isUnix()) {
            shell.run("aws ecr-public get-login-password --region ${region} | docker login ${registryHost} --username AWS --password-stdin")
            return
        }
        steps.powershell(
            "& '${steps.env.WORKSPACE}/scripts/ecr-login.ps1' -Registry '${registryHost}' -Region '${region}' -ConfigDir \"\$env:DOCKER_CONFIG\""
        )
    }

    void build(String image, String tag, String context) {
        shell.run("docker build -t ${image}:${tag} ${context}")
    }

    void push(String image, String tag) {
        shell.run("docker push ${image}:${tag}")
    }

    void pull(String image, String tag) {
        shell.run("docker pull ${image}:${tag}")
    }

    void pullByDigest(String image, String digest) {
        shell.run("docker pull ${image}@${digest}")
    }

    void retag(String image, String sourceTag, String targetTag) {
        shell.run("docker tag ${image}:${sourceTag} ${image}:${targetTag}")
    }

    void retagFromDigest(String image, String digest, String targetTag) {
        shell.run("docker tag ${image}@${digest} ${image}:${targetTag}")
    }

    void remove(String image, String tag) {
        shell.status("docker rmi ${image}:${tag}")
    }

    boolean exists(String image, String tag, boolean insecure = false) {
        return shell.status("docker manifest inspect ${flag(insecure)} ${image}:${tag}") == 0
    }

    String manifest(String image, String tag, boolean insecure = false) {
        return shell.capture("docker manifest inspect ${flag(insecure)} ${image}:${tag}")
    }

    private String flag(boolean insecure) {
        return insecure ? '--insecure' : ''
    }
}
