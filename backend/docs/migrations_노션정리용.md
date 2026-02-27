# Migration Rules (KR)

## 정상 변경
- 스키마 변경이 있을 때마다 버전 마이그레이션(V2, V3, ...) 추가
- 이미 적용된 마이그레이션 파일은 수정 금지
- `spring.jpa.hibernate.ddl-auto=validate` 유지
- 실행 순서: Flyway migrate -> JPA validate -> 앱 부팅

## 복구 변경(사고 대응)
- 테이블/인덱스가 실수로 삭제된 경우에만 사용
- `Vx__recreate_missing_<table>.sql` 같은 복구용 마이그레이션 추가
- 누락된 테이블/인덱스만 재생성
- 데이터는 복구되지 않으므로 백업 복원이 필요하면 별도 진행
- 복구 후 정상 흐름으로 복귀

## 로컬/테스트 가이드
- Flyway + validate 권장
- DB 초기화가 가능하면 드랍 후 마이그레이션 재적용

## 적용된 변경 내역
- `src/main/resources/schema.sql`을 `src/main/resources/db/migration/V1__init.sql`로 이동
- main/test에서 Flyway 활성화 및 기본 `ddl-auto=validate` 적용
- `build.gradle`에 Flyway 의존성 추가
- 테스트는 `db/migration-baseline`(최신 스키마 1개) 경로 사용

## 마이그레이션 흐름
- 앱 시작 시 Flyway가 미적용 마이그레이션을 실행
- JPA는 `ddl-auto=validate`로 스키마-엔티티 정합성 검사
- 운영은 `db/migration` 누적 마이그레이션 유지

## 테스트/로컬 baseline
- 테스트/로컬은 최신 스키마 1개만 적용하도록 `db/migration-baseline` 사용
- baseline 스키마는 최신 구조로 주기적으로 갱신

## 현재 운영 방향 요약
- 운영: `db/migration` 누적 마이그레이션 유지 + `ddl-auto=validate`
- 테스트: `db/migration-baseline`로 최신 스키마 1개만 적용
- 로컬: 필요 시 DB 초기화 후 마이그레이션 재적용

## 자주 묻는 질문 정리(노션용)
### 변경 적용 흐름
- 엔티티 변경 시 반드시 새 마이그레이션(V2, V3...) 파일을 직접 추가
- `validate`는 적용이 아니라 “불일치 검사”만 수행
- 실행 순서: Flyway -> JPA validate -> 앱 부팅

### 버전 감지 방식
- Flyway는 `db/migration` 경로의 파일명을 스캔
- `V2__something.sql` 같은 새 파일이 있으면 자동으로 “새 버전”으로 인식
- 적용 기록은 DB의 `flyway_schema_history` 테이블에 저장

### 초기화/재적용
- 로컬/테스트는 DB를 초기화하면 V1부터 다시 적용
- 운영은 드랍 금지(데이터 손실 위험), 누적 마이그레이션으로만 변경

### 테스트/운영 분리
- 운영/개발 실행: `db/migration` 누적 마이그레이션 사용
- 테스트 실행: `db/migration-baseline` 단일 스키마 사용
