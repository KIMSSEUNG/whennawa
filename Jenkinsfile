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
          docker-compose down || true
          docker-compose up -d --build
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
        docker-compose logs --tail=200 || true
      '''
    }
  }
}