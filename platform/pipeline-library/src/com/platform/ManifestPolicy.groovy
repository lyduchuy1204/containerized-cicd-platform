package com.platform

import com.cloudbees.groovy.cps.NonCPS

class ManifestPolicy implements Serializable {

    @NonCPS
    static List violations(String rendered) {
        def found = []

        if (rendered.contains(':latest')) {
            found.add('image tag latest is not allowed')
        }
        if (rendered.contains('placeholder')) {
            found.add('image tag placeholder was not replaced by the overlay')
        }
        if (!rendered.contains('readOnlyRootFilesystem: true')) {
            found.add('readOnlyRootFilesystem true is missing')
        }
        if (!rendered.contains('runAsNonRoot: true')) {
            found.add('runAsNonRoot true is missing')
        }
        if (!rendered.contains('maxUnavailable: 0')) {
            found.add('rolling update with maxUnavailable 0 is missing')
        }
        if (!rendered.contains('app.kubernetes.io/part-of')) {
            found.add('label app.kubernetes.io/part-of is missing')
        }
        if (!rendered.contains('limits:')) {
            found.add('resource limits are missing')
        }

        return found
    }
}
