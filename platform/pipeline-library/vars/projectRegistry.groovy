def load(String file) {
    return readYaml(file: file)
}

def project(Map registry, String projectName) {
    for (project in registry.projects) {
        if (project.name == projectName) {
            return project
        }
    }
    error "project not declared in the registry: ${projectName}"
}

def setting(Map registry, String projectName, String key, def fallback) {
    def target = project(registry, projectName)
    if (target.containsKey(key)) {
        return target[key]
    }
    if (registry.defaults != null && registry.defaults.containsKey(key)) {
        return registry.defaults[key]
    }
    return fallback
}

def projectNames(Map registry) {
    def names = []
    for (project in registry.projects) {
        names.add(project.name)
    }
    return names
}

def environments(Map registry, String projectName) {
    return project(registry, projectName).environments
}

def serviceNames(Map registry, String projectName) {
    def names = []
    for (service in project(registry, projectName).services) {
        names.add(service.name)
    }
    return names
}

def manifestRoot(Map registry, String projectName) {
    return setting(registry, projectName, 'manifestRoot', 'k8s')
}

def sourceRoot(Map registry, String projectName) {
    return setting(registry, projectName, 'sourceRoot', 'projects')
}

def registryHost(Map registry, String projectName) {
    return setting(registry, projectName, 'registry', 'localhost:5000')
}

def insecureRegistry(Map registry, String projectName) {
    return setting(registry, projectName, 'insecureRegistry', false)
}

def credentialsId(Map registry, String projectName) {
    return setting(registry, projectName, 'registryCredentialsId', '')
}

def migrationJob(Map registry, String projectName) {
    return setting(registry, projectName, 'migrationJob', '')
}

def smokeCommand(Map registry, String projectName) {
    return setting(registry, projectName, 'smokeCommand', '')
}

def hasEnvironment(Map registry, String projectName, String environment) {
    return environments(registry, projectName).contains(environment)
}

def buildPlan(Map registry, String projectName) {
    def plan = []
    for (service in serviceNames(registry, projectName)) {
        plan.add([
            service: service,
            image: imageName(registry, projectName, service),
            context: servicePath(registry, projectName, service)
        ])
    }
    return plan
}

def basePath(Map registry, String projectName) {
    return "${manifestRoot(registry, projectName)}/${projectName}/base"
}

def overlayPath(Map registry, String projectName, String environment) {
    return "${manifestRoot(registry, projectName)}/${projectName}/overlays/${environment}"
}

def servicePath(Map registry, String projectName, String serviceName) {
    return "${sourceRoot(registry, projectName)}/${projectName}/services/${serviceName}"
}

def namespace(Map registry, String projectName, String environment) {
    def separator = setting(registry, projectName, 'namespaceSuffixSeparator', '-')
    return "${projectName}${separator}${environment}"
}

def imageName(Map registry, String projectName, String serviceName) {
    return "${registryHost(registry, projectName)}/${projectName}/${serviceName}"
}

def selectedProjects(Map registry, String projectName) {
    if (projectName == null || projectName.trim().isEmpty()) {
        return projectNames(registry)
    }
    project(registry, projectName.trim())
    return [projectName.trim()]
}

def overlayPaths(Map registry, String projectName) {
    def paths = []
    for (name in selectedProjects(registry, projectName)) {
        for (environment in environments(registry, name)) {
            paths.add(overlayPath(registry, name, environment))
        }
    }
    return paths
}
