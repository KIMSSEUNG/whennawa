pipeline {
  agent any

  triggers {
    githubPush()
  }

  stages {
    stage('Deploy main') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          docker compose down || true
          docker compose build --no-cache
          docker compose up -d
          docker image prune -f
        '''
      }
    }
  }
}
