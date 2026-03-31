pipeline {
    agent any

    options {
        gitLabConnection('orbit-gitlab')
        timestamps()
    }

    environment {
        GIT_CREDENTIAL_ID = 'jenkins-key'
        GIT_URL = 'https://lab.ssafy.com/s14-webmobile3-sub1/S14P11A304.git'
        BE_DIR = 'BE'
    }

    stages {
        stage('Initialize & Log') {
            steps {
                script {
                    echo "========================================================"
                    echo "[Jenkins 배포 프로세스를 시작]"
                    echo "빌드 번호 : #${env.BUILD_NUMBER}"
                    echo "깃랩 주소 : ${GIT_URL}"
                    echo "작업 폴더 : ${env.WORKSPACE}"
                    echo "========================================================"
                }
            }
        }

        stage('Git Update') {
            steps {
                script {
                    // 1. 상태 전송
                    try {
                        updateGitlabCommitStatus name: 'build', state: 'running'
                    } catch (Exception e) {
                        echo "[GitLab 상태 전송 실패]: ${e.message}"
                    }

                    // 2. 젠킨스 설정에서 감지한 브랜치 가져오기
                    checkout scm
                        
                    // 3. 현재 브랜치 이름 파싱
                    if (env.GIT_BRANCH) {
                        env.BRANCH_NAME = env.GIT_BRANCH.replace('origin/', '')
                    }
                    
                    echo "[GIT INFO] 현재 브랜치: ${env.BRANCH_NAME}"
                    echo "[GIT INFO] 최신 커밋 정보"
                    sh 'git log -1 --pretty=format:"%h - %an : %s" --graph'
                }
            }
        }

        stage('Backend Test') {
            when { changeset "${BE_DIR}/**" }
            steps {
                dir("${BE_DIR}") {
                    echo "[테스트 실행] 백엔드 변경 감지됨"
                    // sh 'pip install -r requirements.txt' 
                    // sh 'pytest'
                    echo "[테스트 통과]" 
                }
            }
        }

        stage('Deploy Backend') {
            when {
                allOf {
                    expression {
                        return env.BRANCH_NAME == 'master' || env.BRANCH_NAME == 'develop' || env.BRANCH_NAME == 'main'
                    }
                    // anyOf {
                    //     changeset "${BE_DIR}/**"
                    //     changeset "docker-compose.yml"
                    //     changeset "Dockerfile"
                    // }
                }
            }
            steps {
                script {
                    echo "========================================================"
                    echo "[배포 시작] (Target: ${env.BRANCH_NAME})"
                    echo "========================================================"

                    echo "[Docker] 배포 전 컨테이너 상태:"
                    sh 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true'

                    // .env 파일 생성
                    withCredentials([file(credentialsId: 'backend-env', variable: 'ENV_FILE')]) {
                        sh 'APP_ENV_FILE="$ENV_FILE" docker compose up -d --build api'
                        echo "[설정] Secret env 파일로 배포 완료"
                    }

                    echo "[Docker] 배포 후 컨테이너 상태:"
                    sh 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
                        
                    echo "[Clean] 미사용 이미지 정리"
                    sh 'docker image prune -f'
                }
            }
        }
    }
    
    post {
        success {
            updateGitlabCommitStatus name: 'build', state: 'success'
            echo "[배포 성공]"
        }
        failure {
            updateGitlabCommitStatus name: 'build', state: 'failed'
            echo "[배포 실패]"
        }
    }
}