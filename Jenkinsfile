pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          # Build backend and frontend images
          docker compose build backend frontend

          # Start backend and frontend containers
          docker compose up -d backend frontend

          # Start dozzle separately without touching other services
          docker compose up -d dozzle
        '''
      }
    }
  }

  post {
    failure {
      script {
        if (getContext(hudson.FilePath)) {
          sh '''
            echo ==== Docker Status ====
            docker ps || true
            echo ==== Docker Logs ====
            docker compose logs --tail=200 backend frontend dozzle || true
          '''
        } else {
          echo 'Skipping docker diagnostics because no workspace/node context is available.'
        }
      }
    }
  }
}
