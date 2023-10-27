pipeline {
    agent any
    
    stages {
        stage ("Delegate deployment") {
            steps {
                build(
                    job: "ContainerPipelines/GenericNonProdDockerfileDeployment", 
                    parameters: [
                        string(name: 'GIT_REPO', value: "git@github.com:RandomEskimo/PointSolver.git"),
                        string(name: 'GIT_REPO_NAME', value: "PointSolver"),
                        string(name: 'GIT_HASH', value: env.GIT_COMMIT ),
                        string(name: 'DOCKER_FILE_LOCATION', value: "." ),
                        string(name: 'ContainerName', value: "pointsolver" ),
                        string(name: 'ImageName', value: "pointsolver" ),
                        string(name: 'DockerParams', value: "-p 8015:80" ),
                    ],
                    propagate: true, 
                    wait: true
                )
            }
        }
    }
}
