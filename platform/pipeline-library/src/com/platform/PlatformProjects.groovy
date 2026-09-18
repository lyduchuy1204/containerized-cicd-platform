package com.platform

import com.cloudbees.groovy.cps.NonCPS

class PlatformProjects implements Serializable {

    @NonCPS
    static Map all() {
        return [
            defaults: [
                manifestRoot: 'k8s',
                sourceRoot: 'projects',
                registry: 'public.ecr.aws/e2k8v4q1',
                registryType: 'ecr-public',
                awsRegion: 'us-east-1',
                insecureRegistry: false,
                namespaceSuffixSeparator: '-'
            ],
            projects: [
                [
                    name: 'product-media',
                    description: 'Product media service for merchant uploads, renditions and thumbnails.',
                    owner: 'platform-team',
                    migrationJob: 'api-migration',
                    environments: ['dev', 'staging', 'prod'],
                    services: [
                        [name: 'api', archetype: 'stateless-service', port: 3000, healthPath: '/healthz'],
                        [name: 'portal', archetype: 'stateless-service', port: 8080, healthPath: '/healthz'],
                        [name: 'worker', archetype: 'queue-worker']
                    ]
                ]
            ]
        ]
    }
}
