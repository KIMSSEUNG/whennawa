pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {

    stage('Deploy (main only)') {
      steps {
        script {
          if (env.BRANCH_NAME == 'main') {
            sh '''
              set -e

              cd /var/jenkins_home/workspace/whennawa-deploy

              docker-compose down || true
              docker-compose up -d --build
            '''
          } else {
            echo "Not main branch. Skipping deploy."
          }
        }
      }
    }

  }

  post {
    failure {
      sh '''
        docker-compose ps || true
        docker-compose logs --tail=200 || true
      '''
    }
  }
}