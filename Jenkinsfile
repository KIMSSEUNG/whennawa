pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    DOCKER_BUILDKIT = '1'
    COMPOSE_DOCKER_CLI_BUILD = '1'
  }

  stages {

    stage('Backend Build') {
      steps {
        sh '''
          set -e
          cd backend
          chmod +x gradlew

          # 🔥 Gradle 메모리 제한 (t3.micro 대응)
          export GRADLE_OPTS="-Xmx512m"

          ./gradlew --no-daemon clean build -x test
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
      steps {
        script {
          if (env.BRANCH_NAME == 'main') {
            sh '''
              set -e

              if [ ! -f ".env" ]; then
                echo "[ERROR] .env not found in workspace."
                exit 1
              fi

              docker compose down --remove-orphans || true
              docker compose up -d --build
            '''
          } else {
            echo "Not main branch. Skipping deploy."
          }
        }
      }
    }

    stage('Health Check (main only)') {
      steps {
        script {
          if (env.BRANCH_NAME == 'main') {
            sh '''
              set -e
              sleep 15

              # timeout 5초
              curl -m 5 -fsS http://127.0.0.1:3000 > /dev/null
              curl -m 5 -fsS "http://127.0.0.1:8080/api/companies/search?query=test" > /dev/null
            '''
          }
        }
      }
    }

  }

  post {
    success {
      echo "Build & Deploy Success ✅"
    }

    failure {
      echo "Build Failed ❌"

      sh '''
        echo "==== Docker Status ===="
        docker compose ps || true

        echo "==== Docker Logs ===="
        docker compose logs --tail=200 || true
      '''
    }
  }
}