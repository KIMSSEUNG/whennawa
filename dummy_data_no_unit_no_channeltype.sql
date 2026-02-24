USE when_nawa;
SET NAMES utf8mb4;

-- 회사 조회/검색/제보 처리 확인용 더미
SET @company_a := '테스트회사_공채수시';
SET @company_b := '테스트회사_UI검증';

-- 기존 더미 정리
SET @company_a_id := (SELECT company_id FROM company WHERE company_name = @company_a LIMIT 1);
SET @company_b_id := (SELECT company_id FROM company WHERE company_name = @company_b LIMIT 1);

DELETE FROM rolling_step_log WHERE company_name IN (@company_a, @company_b);
DELETE FROM step_date_report WHERE company_name IN (@company_a, @company_b);

DELETE FROM recruitment_step
WHERE channel_id IN (
  SELECT channel_id FROM recruitment_channel WHERE company_id IN (@company_a_id, @company_b_id)
);

DELETE FROM recruitment_channel WHERE company_id IN (@company_a_id, @company_b_id);
DELETE FROM company WHERE company_name IN (@company_a, @company_b);

-- 회사 생성
INSERT INTO company (company_name, is_active)
VALUES
(@company_a, 1),
(@company_b, 1);

SET @company_a_id := (SELECT company_id FROM company WHERE company_name = @company_a LIMIT 1);
SET @company_b_id := (SELECT company_id FROM company WHERE company_name = @company_b LIMIT 1);

-- 공채 채널(연도 단일)
INSERT INTO recruitment_channel (company_id, year, is_active)
VALUES
(@company_a_id, 2026, 1),
(@company_b_id, 2026, 1);

SET @channel_a := (SELECT channel_id FROM recruitment_channel WHERE company_id = @company_a_id AND year = 2026 LIMIT 1);
SET @channel_b := (SELECT channel_id FROM recruitment_channel WHERE company_id = @company_b_id AND year = 2026 LIMIT 1);

-- 전형 스텝
INSERT INTO recruitment_step (channel_id, step_name)
VALUES
(@channel_a, '지원서 접수 마감'),
(@channel_a, '서류 합격'),
(@channel_a, '코딩테스트 합격'),
(@channel_a, '1차 면접 합격'),
(@channel_a, '최종 합격'),
(@channel_b, '지원서 접수'),
(@channel_b, '서류 합격'),
(@channel_b, '과제 전형 합격'),
(@channel_b, '최종 합격');

-- 간격 통계 로그 (공개/검색/예상 발표일 확인용)
INSERT INTO rolling_step_log (
  company_id,
  company_name,
  current_step_name,
  rolling_result_type,
  source_type,
  prev_reported_date,
  reported_date,
  report_count,
  created_at,
  updated_at
)
VALUES
(@company_a_id, @company_a, '서류 합격', 'DATE_REPORTED', 'REPORT', '2026-01-10', '2026-01-24', 4, NOW(), NOW()),
(@company_a_id, @company_a, '코딩테스트 합격', 'DATE_REPORTED', 'REPORT', '2026-01-24', '2026-02-07', 3, NOW(), NOW()),
(@company_a_id, @company_a, '1차 면접 합격', 'DATE_REPORTED', 'REPORT', '2026-02-07', '2026-02-21', 2, NOW(), NOW()),
(@company_a_id, @company_a, '최종 합격', 'DATE_REPORTED', 'REPORT', '2026-02-21', '2026-03-14', 2, NOW(), NOW()),
(@company_a_id, @company_a, '최종 합격', 'NO_RESPONSE_REPORTED', 'REPORT', NULL, NULL, 1, NOW(), NOW()),

(@company_b_id, @company_b, '서류 합격', 'DATE_REPORTED', 'OFFICIAL', '2026-03-03', '2026-03-17', 2, NOW(), NOW()),
(@company_b_id, @company_b, '과제 전형 합격', 'DATE_REPORTED', 'REPORT', '2026-03-17', '2026-03-27', 2, NOW(), NOW()),
(@company_b_id, @company_b, '최종 합격', 'DATE_REPORTED', 'REPORT', '2026-03-27', '2026-04-12', 1, NOW(), NOW());

-- 제보 원본 데이터(step_date_report) 샘플
INSERT INTO step_date_report (
  company_id,
  company_name,
  recruitment_mode,
  rolling_result_type,
  reported_date,
  prev_reported_date,
  current_step_name,
  report_count,
  status,
  deleted_at,
  created_at,
  updated_at
)
VALUES
(@company_a_id, @company_a, 'REGULAR', NULL, '2026-03-14', '2026-02-21', NULL, '최종 합격', 2, 'PENDING', NULL, NOW(), NOW()),
(@company_a_id, @company_a, 'ROLLING', 'DATE_REPORTED', '2026-03-27', '2026-03-17', NULL, '과제 전형 합격', 1, 'PENDING', NULL, NOW(), NOW()),
(@company_b_id, @company_b, 'ROLLING', 'NO_RESPONSE_REPORTED', NULL, NULL, NULL, '1차 면접 합격', 1, 'PENDING', NULL, NOW(), NOW());

-- 확인용 쿼리
SELECT company_id, company_name, is_active
FROM company
WHERE company_name IN (@company_a, @company_b)
ORDER BY company_name;
