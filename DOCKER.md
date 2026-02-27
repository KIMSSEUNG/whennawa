# Docker 실행 가이드

## 1) 환경변수 준비
루트에서 `.env.docker.example`를 복사해 `.env`를 만들고 값을 채우세요.

필수:
- `APP_TOKEN_ENC_KEY` (base64 32바이트 키)

## 2) 빌드/실행
```bash
docker compose up -d --build
```

접속:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- MySQL: `localhost:3306`

## 3) 초기 데이터 주입(선택)
`docker-compose.yml`의 아래 라인 주석을 해제하면 DB 최초 생성 시 seed SQL을 실행합니다.
```yaml
# - ./dummy_all_features_v1.sql:/docker-entrypoint-initdb.d/01-seed.sql:ro
```

## 4) 종료
```bash
docker compose down
```
