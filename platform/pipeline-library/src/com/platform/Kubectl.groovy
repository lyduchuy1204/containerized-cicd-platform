package com.platform

class Kubectl implements Serializable {

    private final def steps
    private final Shell shell

    Kubectl(def steps) {
        this.steps = steps
        this.shell = new Shell(steps)
    }

    String render(String overlayPath) {
        return shell.capture("kubectl kustomize ${overlayPath}")
    }

    void dryRun(String overlayPath) {
        shell.run("kubectl apply -k ${overlayPath} --dry-run=server")
    }

    void apply(String overlayPath) {
        shell.run("kubectl apply -k ${overlayPath}")
    }

    void waitRollout(String namespace, String deployment, String timeout = '5m') {
        shell.run("kubectl -n ${namespace} rollout status deployment/${deployment} --timeout=${timeout}")
    }

    void undoRollout(String namespace, String deployment) {
        shell.run("kubectl -n ${namespace} rollout undo deployment/${deployment}")
    }

    void restartRollout(String namespace, String deployment) {
        shell.run("kubectl -n ${namespace} rollout restart deployment/${deployment}")
    }

    void deleteJob(String namespace, String jobName) {
        shell.run("kubectl -n ${namespace} delete job ${jobName} --ignore-not-found")
    }

    void waitJob(String namespace, String jobName, String timeout = '240s') {
        shell.run("kubectl -n ${namespace} wait --for=condition=complete job/${jobName} --timeout=${timeout}")
    }

    void jobLogs(String namespace, String jobName) {
        shell.status("kubectl -n ${namespace} logs job/${jobName} --tail=40")
    }

    boolean namespaceExists(String namespace) {
        return shell.status("kubectl get namespace ${namespace}") == 0
    }

    void ensureNamespace(String namespace) {
        if (namespaceExists(namespace)) {
            steps.echo "namespace ${namespace} already exists"
            return
        }
        shell.run("kubectl create namespace ${namespace}")
    }

    String runningDigest(String namespace, String serviceName) {
        def raw = ''
        try {
            raw = shell.capture("kubectl -n ${namespace} get pod -l app.kubernetes.io/name=${serviceName} -o jsonpath={.items[0].status.containerStatuses[0].imageID}")
        } catch (failure) {
            return ''
        }

        if (!raw.contains('@')) {
            return ''
        }
        return raw.substring(raw.indexOf('@') + 1)
    }
}
