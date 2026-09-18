def all() {
    return [
        defaults: [
            manifestRoot: 'k8s',
            sourceRoot: 'projects',
            registry: 'localhost:5000',
            insecureRegistry: true,
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
