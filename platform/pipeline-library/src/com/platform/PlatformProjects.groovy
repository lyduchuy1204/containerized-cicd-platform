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
                namespaceSuffixSeparator: '-',
                sourceCheckoutDir: '.sources'
            ],
            projects: [
                [
                    name: 'product-media',
                    description: 'Product media service for merchant uploads, renditions and thumbnails.',
                    owner: 'platform-team',
                    migrationJob: 'api-migration',
                    migrationService: 'api',
                    environments: ['dev', 'staging', 'prod'],
                    services: [
                        [
                            name: 'api',
                            archetype: 'stateless-service',
                            port: 3000,
                            healthPath: '/healthz',
                            repo: 'https://github.com/lyduchuy1204/media-platform-backend.git',
                            ref: 'main'
                        ],
                        [
                            name: 'portal',
                            archetype: 'stateless-service',
                            port: 8080,
                            healthPath: '/healthz',
                            repo: 'https://github.com/lyduchuy1204/media-platform-frontend.git',
                            ref: 'main'
                        ],
                        [
                            name: 'worker',
                            archetype: 'queue-worker',
                            repo: 'https://github.com/lyduchuy1204/media-platform-video-processor.git',
                            ref: 'main'
                        ]
                    ]
                ]
            ]
        ]
    }
}
