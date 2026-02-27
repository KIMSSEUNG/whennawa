# Backend

Spring Boot backend for WhenNawa search timelines.

## Prerequisites
- JDK 17+
- Google OAuth client credentials (login)
- `APP_TOKEN_ENC_KEY` environment variable (base64-encoded 32 bytes)

Generate a key example:
```
python - <<'PY'
import os, base64
print(base64.b64encode(os.urandom(32)).decode())
PY
```

## Configuration
Update `backend/src/main/resources/application.properties`:
- `spring.security.oauth2.client.registration.google.client-id`
- `spring.security.oauth2.client.registration.google.client-secret`
- `app.frontend.base-url`

## Run
```
./gradlew bootRun
```
