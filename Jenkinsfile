pipeline {
    agent any

    environment {
        APP_NAME = 'central-erp-backend'
        NODE_IMAGE = 'node:22-alpine'

        // Host path mapped to Jenkins workspace
        WORKSPACE_HOST =
            '/www/dk_project/dk_app/jenkins/jenkins_6f7k/data/workspace/backend-ci'

        DOCKER_IMAGE = 'central-erp-backend'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code...'

                checkout scm

                sh '''
                    echo "Branch:"
                    git branch --show-current

                    echo "Commit:"
                    git rev-parse --short HEAD

                    echo "Repository files:"
                    ls -la
                '''
            }
        }

        stage('Environment Check') {
            steps {
                echo 'Checking build environment...'

                sh '''
                    echo "Docker:"
                    docker --version

                    echo "Node:"
                    docker run --rm ${NODE_IMAGE} node --version

                    echo "pnpm:"
                    docker run --rm ${NODE_IMAGE} sh -c \
                        'corepack enable && pnpm --version'
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'

                sh '''
                    docker run --rm \
                        -v ${WORKSPACE_HOST}:/app \
                        -w /app \
                        ${NODE_IMAGE} \
                        sh -c '
                            corepack enable &&
                            pnpm install --frozen-lockfile --ignore-scripts
                        '
                '''
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'

                sh '''
                    docker run --rm \
                        -v ${WORKSPACE_HOST}:/app \
                        -w /app \
                        ${NODE_IMAGE} \
                        sh -c '
                            corepack enable &&
                            pnpm exec jest --runInBand
                        '
                '''
            }
        }

        stage('Build') {
            steps {
                echo 'Building NestJS application...'

                sh '''
                    docker run --rm \
                        -v ${WORKSPACE_HOST}:/app \
                        -w /app \
                        ${NODE_IMAGE} \
                        sh -c '
                            corepack enable &&
                            pnpm run build
                        '
                '''
            }
        }

        stage('Generate Docker Tag') {
            steps {
                script {
                    env.GIT_SHA = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${env.DOCKER_IMAGE}:${env.GIT_SHA}"

                    echo "Docker image tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Docker Build') {
            steps {
                echo "Building Docker image: ${IMAGE_TAG}"

                sh '''
                    docker build \
                        -t ${IMAGE_TAG} \
                        -t ${DOCKER_IMAGE}:latest \
                        .
                '''
            }
        }

        stage('Docker Image Check') {
            steps {
                echo 'Verifying Docker image...'

                sh '''
                    docker image inspect ${IMAGE_TAG}

                    echo "Created images:"
                    docker images ${DOCKER_IMAGE}
                '''
            }
        }

        stage('Cleanup Old Images') {
            steps {
                echo 'Cleaning old backend Docker images...'

                sh '''
                    IMAGES=$(docker images "${DOCKER_IMAGE}" \
                        --format "{{.Repository}}:{{.Tag}}" \
                        | grep -v ":latest$" \
                        | tail -n +6)

                    if [ -n "$IMAGES" ]; then
                        echo "Removing old images:"
                        echo "$IMAGES"

                        echo "$IMAGES" | xargs -r docker rmi
                    else
                        echo "No old images to remove."
                    fi
                '''
            }
        }
    }

    post {

        success {
            echo """
            ==========================================
            BACKEND CI SUCCESS
            ==========================================

            Application : ${APP_NAME}
            Jenkins Build: ${BUILD_NUMBER}
            Git Commit   : ${GIT_SHA}

            Docker Image:
            ${IMAGE_TAG}

            Latest:
            ${DOCKER_IMAGE}:latest

            ==========================================
            """
        }

        failure {
            echo """
            ==========================================
            BACKEND CI FAILED
            ==========================================

            Jenkins Build: ${BUILD_NUMBER}

            Check the failed stage above.

            ==========================================
            """
        }

        always {
            echo 'Pipeline finished.'
        }
    }
}