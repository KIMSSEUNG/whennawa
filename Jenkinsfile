pipeline {
  agent any

  options {
    timestamps()
    ansiColor('xterm')
    disableConcurrentBuilds()
  }

  // GitHub webhook trigger (GitHub plugin)
  triggers {
    githubPush()
  }

  environment {
    DOCKER_BUILDKIT = '1'
    COMPOSE_DOCKER_CLI_BUILD = '1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend Build') {
      steps {
        sh '''
          set -e
          cd backend
          chmod +x gradlew
          ./gradlew --no-daemon clean compileJava
        '''
      }
    }

    stage('Frontend Build') {
      steps {
        sh '''
          set -e
          cd frontend
          npm ci
          npm run build
        '''
      }
    }

    stage('Deploy (main only)') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          set -e

          if [ ! -f ".env" ]; then
            echo "[ERROR] .env not found in workspace."
            echo "Create .env on Jenkins host (or inject it before deploy)."
            exit 1
          fi

          docker compose down --remove-orphans || true
          docker compose up -d --build
        '''
      }
    }

    stage('Health Check (main only)') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          set -e

          # frontend
          curl -fsS http://127.0.0.1:3000 > /dev/null

          # backend
          curl -fsS "http://127.0.0.1:8080/api/companies/search?query=test" > /dev/null
        '''
      }
    }
  }

  post {
    failure {
      sh '''
        docker compose ps || true
        docker compose logs --tail=200 || true
      '''
    }
  }
}
