package com.platform

class ImageTag implements Serializable {

    private final def steps
    private final Shell shell

    ImageTag(def steps) {
        this.steps = steps
        this.shell = new Shell(steps)
    }

    String commit(int length = 7) {
        def sha = steps.env.GIT_COMMIT ?: shell.capture('git rev-parse HEAD')
        return sha.take(length)
    }

    boolean clean() {
        return shell.capture('git status --porcelain').isEmpty()
    }
}
