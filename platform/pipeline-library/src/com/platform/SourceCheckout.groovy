package com.platform

class SourceCheckout implements Serializable {

    private final def steps

    SourceCheckout(def steps) {
        this.steps = steps
    }

    String clone(String directory, String repo, String ref) {
        def resolved = ''
        steps.dir(directory) {
            def scmVars = steps.checkout([
                $class: 'GitSCM',
                branches: [[name: ref]],
                userRemoteConfigs: [[url: repo]],
                extensions: [[$class: 'CleanBeforeCheckout']]
            ])
            resolved = scmVars.GIT_COMMIT
        }
        return resolved ?: ''
    }

    Map cloneAll(List plan) {
        def commits = [:]
        for (unit in plan) {
            if (!unit.repo) {
                steps.error "service ${unit.service} khong khai bao repo trong registry"
            }
            steps.echo "clone ${unit.repo} ref ${unit.ref} vao ${unit.context}"
            def sha = clone(unit.context, unit.repo, unit.ref)
            commits[unit.service] = sha
            steps.echo "  ${unit.service} tai commit ${sha}"
        }
        return commits
    }
}
