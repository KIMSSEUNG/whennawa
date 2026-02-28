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
          cd $WORKSPACE

          # 1️⃣ backend / frontend만 빌드
          docker compose build backend frontend

          # 2️⃣ backend / frontend만 재시작
          docker compose up -d backend frontend
        '''
      }
    }
  }

  post {
    failure {
      sh '''
        echo ==== Docker Status ====
        docker ps || true
        echo ==== Docker Logs ====
        docker compose logs --tail=200 backend frontend || true
      '''
    }
  }
}