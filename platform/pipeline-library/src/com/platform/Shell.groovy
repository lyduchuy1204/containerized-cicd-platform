package com.platform

class Shell implements Serializable {

    private final def steps

    Shell(def steps) {
        this.steps = steps
    }

    void run(String command) {
        if (steps.isUnix()) {
            steps.sh command
        } else {
            steps.bat command
        }
    }

    String capture(String command) {
        if (steps.isUnix()) {
            return steps.sh(script: command, returnStdout: true).trim()
        }
        return steps.bat(script: "@${command}", returnStdout: true).trim()
    }

    int status(String command) {
        if (steps.isUnix()) {
            return steps.sh(script: command, returnStatus: true)
        }
        return steps.bat(script: "@${command}", returnStatus: true)
    }
}
