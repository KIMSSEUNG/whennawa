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

          # 2️⃣ backend / frontend 재시작
          docker compose up -d backend frontend

          # 3️⃣ dozzle이 꺼져 있으면 자동 실행 (db는 건드리지 않음)
          docker compose up -d dozzle
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
        docker compose logs --tail=200 backend frontend dozzle || true
      '''
    }
  }
}