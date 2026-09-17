def render(String overlayPath) {
    return sh(script: "kubectl kustomize ${overlayPath}", returnStdout: true)
}

def dryRun(String overlayPath) {
    sh "kubectl apply -k ${overlayPath} --dry-run=server"
}

def apply(String overlayPath) {
    sh "kubectl apply -k ${overlayPath}"
}

def setImageTag(String overlayPath, String image, String tag) {
    sh "cd ${overlayPath} && kustomize edit set image ${image}:${tag}"
}

def waitRollout(String namespace, String deployment, String timeout = '5m') {
    sh "kubectl -n ${namespace} rollout status deployment/${deployment} --timeout=${timeout}"
}

def undoRollout(String namespace, String deployment) {
    sh "kubectl -n ${namespace} rollout undo deployment/${deployment}"
}

def restartRollout(String namespace, String deployment) {
    sh "kubectl -n ${namespace} rollout restart deployment/${deployment}"
}

def runningDigest(String namespace, String serviceName) {
    return sh(
        script: "kubectl -n ${namespace} get pod -l app.kubernetes.io/name=${serviceName} -o jsonpath={.items[0].status.containerStatuses[0].imageID}",
        returnStdout: true
    ).trim()
}
