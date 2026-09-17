def toDigests(String namespace, String tag, List plan, Map digests) {
    def restored = []

    for (unit in plan) {
        def digest = digests[unit.service]
        if (!digest) {
            echo "no previous digest recorded for ${unit.service}, leaving it untouched"
            continue
        }
        dockerImage.pullByDigest(unit.image, digest)
        dockerImage.retagFromDigest(unit.image, digest, tag)
        dockerImage.push(unit.image, tag)
        restored.add(unit.service)
    }

    if (!restored) {
        echo 'nothing to roll back'
        return restored
    }

    for (service in restored) {
        k8s.restartRollout(namespace, service)
    }
    for (service in restored) {
        k8s.waitRollout(namespace, service)
    }

    echo "rolled back to the previous digest: ${restored.join(', ')}"
    return restored
}
