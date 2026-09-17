def commit(int length = 7) {
    def sha = env.GIT_COMMIT ?: sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
    return sha.take(length)
}

def isClean() {
    return sh(script: 'git status --porcelain', returnStdout: true).trim().isEmpty()
}
