package com.platform

class Rollback implements Serializable {

    private final def steps
    private final Kubectl kubectl
    private final DockerImage image

    Rollback(def steps) {
        this.steps = steps
        this.kubectl = new Kubectl(steps)
        this.image = new DockerImage(steps)
    }

    List toDigests(String namespace, String tag, List plan, Map digests) {
        def restored = []

        for (unit in plan) {
            def digest = digests[unit.service]
            if (!digest) {
                steps.echo "no previous digest recorded for ${unit.service}, leaving it untouched"
                continue
            }
            image.pullByDigest(unit.image, digest)
            image.retagFromDigest(unit.image, digest, tag)
            image.push(unit.image, tag)
            restored.add(unit.service)
        }

        if (!restored) {
            steps.echo 'nothing to roll back'
            return restored
        }

        for (service in restored) {
            kubectl.restartRollout(namespace, service)
        }
        for (service in restored) {
            kubectl.waitRollout(namespace, service)
        }

        steps.echo "rolled back to the previous digest: ${restored.join(', ')}"
        return restored
    }
}
