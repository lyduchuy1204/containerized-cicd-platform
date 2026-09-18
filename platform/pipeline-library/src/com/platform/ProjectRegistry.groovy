package com.platform

import com.cloudbees.groovy.cps.NonCPS

class ProjectRegistry implements Serializable {

    @NonCPS
    static Map load() {
        return PlatformProjects.all()
    }

    @NonCPS
    static Map project(Map registry, String projectName) {
        for (project in registry.projects) {
            if (project.name == projectName) {
                return project
            }
        }
        throw new IllegalArgumentException("project not declared in the registry: ${projectName}")
    }

    @NonCPS
    static def setting(Map registry, String projectName, String key, def fallback) {
        def target = project(registry, projectName)
        if (target.containsKey(key)) {
            return target[key]
        }
        if (registry.defaults != null && registry.defaults.containsKey(key)) {
            return registry.defaults[key]
        }
        return fallback
    }

    @NonCPS
    static List projectNames(Map registry) {
        def names = []
        for (project in registry.projects) {
            names.add(project.name)
        }
        return names
    }

    @NonCPS
    static List environments(Map registry, String projectName) {
        return project(registry, projectName).environments
    }

    @NonCPS
    static List serviceNames(Map registry, String projectName) {
        def names = []
        for (service in project(registry, projectName).services) {
            names.add(service.name)
        }
        return names
    }

    @NonCPS
    static String manifestRoot(Map registry, String projectName) {
        return setting(registry, projectName, 'manifestRoot', 'k8s')
    }

    @NonCPS
    static String sourceRoot(Map registry, String projectName) {
        return setting(registry, projectName, 'sourceRoot', 'projects')
    }

    @NonCPS
    static String registryHost(Map registry, String projectName) {
        return setting(registry, projectName, 'registry', 'localhost:5000')
    }

    @NonCPS
    static boolean insecureRegistry(Map registry, String projectName) {
        return setting(registry, projectName, 'insecureRegistry', false)
    }

    @NonCPS
    static String credentialsId(Map registry, String projectName) {
        return setting(registry, projectName, 'registryCredentialsId', '')
    }

    @NonCPS
    static String registryType(Map registry, String projectName) {
        return setting(registry, projectName, 'registryType', '')
    }

    @NonCPS
    static String awsRegion(Map registry, String projectName) {
        return setting(registry, projectName, 'awsRegion', 'us-east-1')
    }

    @NonCPS
    static String migrationJob(Map registry, String projectName) {
        return setting(registry, projectName, 'migrationJob', '')
    }

    @NonCPS
    static String smokeCommand(Map registry, String projectName) {
        return setting(registry, projectName, 'smokeCommand', '')
    }

    @NonCPS
    static boolean hasEnvironment(Map registry, String projectName, String environment) {
        return environments(registry, projectName).contains(environment)
    }

    @NonCPS
    static String basePath(Map registry, String projectName) {
        return "${manifestRoot(registry, projectName)}/${projectName}/base".toString()
    }

    @NonCPS
    static String overlayPath(Map registry, String projectName, String environment) {
        return "${manifestRoot(registry, projectName)}/${projectName}/overlays/${environment}".toString()
    }

    @NonCPS
    static String sourceCheckoutDir(Map registry, String projectName) {
        return setting(registry, projectName, 'sourceCheckoutDir', '.sources')
    }

    @NonCPS
    static String servicePath(Map registry, String projectName, String serviceName) {
        return "${sourceCheckoutDir(registry, projectName)}/${serviceName}".toString()
    }

    @NonCPS
    static String namespace(Map registry, String projectName, String environment) {
        def separator = setting(registry, projectName, 'namespaceSuffixSeparator', '-')
        return "${projectName}${separator}${environment}".toString()
    }

    @NonCPS
    static String imageName(Map registry, String projectName, String serviceName) {
        return "${registryHost(registry, projectName)}/${projectName}/${serviceName}".toString()
    }

    @NonCPS
    static List buildPlan(Map registry, String projectName, String serviceName = '') {
        def wanted = serviceName == null ? '' : serviceName.trim()
        def plan = []
        for (service in project(registry, projectName).services) {
            if (wanted && service.name != wanted) {
                continue
            }
            plan.add([
                service: service.name,
                image: imageName(registry, projectName, service.name),
                context: servicePath(registry, projectName, service.name),
                repo: service.repo ?: '',
                ref: service.ref ?: 'main'
            ])
        }
        if (wanted && !plan) {
            throw new IllegalArgumentException("service not declared for ${projectName}: ${wanted}")
        }
        return plan
    }

    @NonCPS
    static String migrationService(Map registry, String projectName) {
        return setting(registry, projectName, 'migrationService', '')
    }

    @NonCPS
    static String jobPrefix(Map registry, String projectName, String serviceName) {
        return "${projectName}-${serviceName}".toString()
    }

    @NonCPS
    static List selectedProjects(Map registry, String projectName) {
        if (projectName == null || projectName.trim().isEmpty()) {
            return projectNames(registry)
        }
        project(registry, projectName.trim())
        return [projectName.trim()]
    }

    @NonCPS
    static List overlayPaths(Map registry, String projectName) {
        def paths = []
        for (name in selectedProjects(registry, projectName)) {
            for (environment in environments(registry, name)) {
                paths.add(overlayPath(registry, name, environment))
            }
        }
        return paths
    }

    @NonCPS
    static List namespaces(Map registry, String projectName) {
        def result = []
        for (name in selectedProjects(registry, projectName)) {
            for (environment in environments(registry, name)) {
                result.add(namespace(registry, name, environment))
            }
        }
        return result
    }
}
