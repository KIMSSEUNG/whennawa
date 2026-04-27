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
          # Build and start the full stack
          docker compose up -d --build
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
            docker compose logs --tail=200 db postgres backend essay-backend frontend dozzle || true
          '''
        } else {
          echo 'Skipping docker diagnostics because no workspace/node context is available.'
        }
      }
    }
  }
}
