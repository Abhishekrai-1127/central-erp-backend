pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Repository checkout successful'
            }
        }

        stage('Environment Check') {
            steps {
                sh 'git --version'
                sh 'docker --version'
                sh 'pwd'
                sh 'ls -la'
            }
        }

        stage('Build Test') {
            steps {
                echo 'Jenkins pipeline is working'
            }
        }
    }

    post {
        success {
            echo 'Backend CI pipeline completed successfully'
        }

        failure {
            echo 'Backend CI pipeline failed'
        }
    }
}
