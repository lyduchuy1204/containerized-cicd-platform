def run(String command) {
    if (isUnix()) {
        sh command
    } else {
        bat command
    }
}

def capture(String command) {
    if (isUnix()) {
        return sh(script: command, returnStdout: true).trim()
    }
    return bat(script: "@${command}", returnStdout: true).trim()
}

def status(String command) {
    if (isUnix()) {
        return sh(script: command, returnStatus: true)
    }
    return bat(script: "@${command}", returnStatus: true)
}
