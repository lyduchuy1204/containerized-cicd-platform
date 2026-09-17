def commit(int length = 7) {
    def sha = env.GIT_COMMIT ?: shell.capture('git rev-parse HEAD')
    return sha.take(length)
}

def isClean() {
    return shell.capture('git status --porcelain').isEmpty()
}
