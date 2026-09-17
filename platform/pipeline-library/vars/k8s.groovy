def render(String overlayPath) {
    return shell.capture("kubectl kustomize ${overlayPath}")
}

def dryRun(String overlayPath) {
    shell.run("kubectl apply -k ${overlayPath} --dry-run=server")
}

def apply(String overlayPath) {
    shell.run("kubectl apply -k ${overlayPath}")
}

def setImageTag(String overlayPath, String image, String tag) {
    dir(overlayPath) {
        shell.run("kustomize edit set image ${image}:${tag}")
    }
}

def waitRollout(String namespace, String deployment, String timeout = '5m') {
    shell.run("kubectl -n ${namespace} rollout status deployment/${deployment} --timeout=${timeout}")
}

def undoRollout(String namespace, String deployment) {
    shell.run("kubectl -n ${namespace} rollout undo deployment/${deployment}")
}

def restartRollout(String namespace, String deployment) {
    shell.run("kubectl -n ${namespace} rollout restart deployment/${deployment}")
}

def deleteJob(String namespace, String jobName) {
    shell.run("kubectl -n ${namespace} delete job ${jobName} --ignore-not-found")
}

def waitJob(String namespace, String jobName, String timeout = '240s') {
    shell.run("kubectl -n ${namespace} wait --for=condition=complete job/${jobName} --timeout=${timeout}")
}

def jobLogs(String namespace, String jobName) {
    shell.status("kubectl -n ${namespace} logs job/${jobName} --tail=40")
}

def ensureNamespace(String namespace) {
    shell.run("kubectl create namespace ${namespace} --dry-run=client -o yaml > namespace-ensure.yaml")
    shell.run('kubectl apply -f namespace-ensure.yaml')
}

def runningDigest(String namespace, String serviceName) {
    def raw = ''
    try {
        raw = shell.capture("kubectl -n ${namespace} get pod -l app.kubernetes.io/name=${serviceName} -o jsonpath={.items[0].status.containerStatuses[0].imageID}")
    } catch (error) {
        return ''
    }

    if (!raw.contains('@')) {
        return ''
    }
    return raw.substring(raw.indexOf('@') + 1)
}
