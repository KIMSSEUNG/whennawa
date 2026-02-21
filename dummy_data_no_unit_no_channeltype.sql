USE when_nawa;

SET @company_name := '테스트회사_공채수시';

-- 기존 더미 정리
SET @company_id := (SELECT company_id FROM company WHERE company_name = @company_name LIMIT 1);

DELETE FROM rolling_step_log WHERE company_name = @company_name;
DELETE FROM step_date_report WHERE company_name = @company_name;

DELETE FROM step_date_log
WHERE step_id IN (
  SELECT s.step_id
  FROM recruitment_step s
  JOIN recruitment_channel ch ON ch.channel_id = s.channel_id
  WHERE ch.company_id = @company_id
);

DELETE FROM recruitment_step
WHERE channel_id IN (
  SELECT channel_id FROM recruitment_channel WHERE company_id = @company_id
);

DELETE FROM recruitment_channel WHERE company_id = @company_id;
DELETE FROM company WHERE company_name = @company_name;

-- 회사 생성
INSERT INTO company (company_name, is_active)
VALUES (@company_name, 1);

SET @company_id := (SELECT company_id FROM company WHERE company_name = @company_name LIMIT 1);

-- 공채 채널(채널타입 제거 구조)
INSERT INTO recruitment_channel (company_id, year, is_active)
VALUES (@company_id, 2026, 1);

SET @channel_id := (
  SELECT channel_id
  FROM recruitment_channel
  WHERE company_id = @company_id
  ORDER BY channel_id DESC
  LIMIT 1
);

-- 전형 스텝 생성
INSERT INTO recruitment_step (channel_id, step_name, step_order, prev_step_id, next_step_id)
VALUES
(@channel_id, '지원서 접수 마감', 1, NULL, NULL),
(@channel_id, '서류 합격', 2, 1, NULL),
(@channel_id, '코딩테스트 합격', 3, 2, NULL),
(@channel_id, '1차 면접 합격', 4, 3, NULL),
(@channel_id, '최종 합격', 5, 4, NULL);

SET @step1 := (SELECT step_id FROM recruitment_step WHERE channel_id = @channel_id AND step_order = 1 LIMIT 1);
SET @step2 := (SELECT step_id FROM recruitment_step WHERE channel_id = @channel_id AND step_order = 2 LIMIT 1);
SET @step3 := (SELECT step_id FROM recruitment_step WHERE channel_id = @channel_id AND step_order = 3 LIMIT 1);
SET @step4 := (SELECT step_id FROM recruitment_step WHERE channel_id = @channel_id AND step_order = 4 LIMIT 1);
SET @step5 := (SELECT step_id FROM recruitment_step WHERE channel_id = @channel_id AND step_order = 5 LIMIT 1);

-- 공채 타임라인 기준 로그(공개/검색 노출용)
INSERT INTO step_date_log (step_id, target_date, date_type, report_count)
VALUES
(@step1, '2026-01-10 00:00:00', 'REPORT', 3),
(@step2, '2026-01-24 00:00:00', 'REPORT', 3),
(@step3, '2026-02-07 00:00:00', 'REPORT', 3),
(@step4, '2026-02-21 00:00:00', 'REPORT', 2),
(@step5, '2026-03-14 00:00:00', 'REPORT', 2);

-- 제보 원본 (관리자 페이지/처리용)
INSERT INTO step_date_report (
  company_id,
  company_name,
  recruitment_mode,
  rolling_result_type,
  reported_date,
  prev_reported_date,
  step_id,
  step_name_raw,
  current_step_name,
  report_count,
  status,
  deleted_at,
  created_at,
  updated_at
)
VALUES
(@company_id, @company_name, 'REGULAR', 'DATE_REPORTED', '2026-02-24', '2026-02-10', NULL, '서류 합격', NULL, 1, 'PENDING', NULL, NOW(), NOW()),
(@company_id, @company_name, 'REGULAR', 'DATE_REPORTED', '2026-03-09', '2026-02-24', NULL, '코딩테스트 합격', NULL, 1, 'PENDING', NULL, NOW(), NOW()),
(@company_id, @company_name, 'ROLLING', 'DATE_REPORTED', '2026-02-20', '2026-02-05', NULL, NULL, '코딩테스트 합격', 1, 'PENDING', NULL, NOW(), NOW()),
(@company_id, @company_name, 'ROLLING', 'NO_RESPONSE_REPORTED', NULL, NULL, NULL, NULL, '최종 합격', 1, 'PENDING', NULL, NOW(), NOW());

-- 수시/공채 간격 계산 로그(예상 발표일/연관검색어용)
INSERT INTO rolling_step_log (
  company_id,
  company_name,
  current_step_name,
  rolling_result_type,
  prev_reported_date,
  reported_date,
  report_count,
  created_at,
  updated_at
)
VALUES
(@company_id, @company_name, '서류 합격', 'DATE_REPORTED', '2026-01-10', '2026-01-24', 3, NOW(), NOW()),
(@company_id, @company_name, '코딩테스트 합격', 'DATE_REPORTED', '2026-01-24', '2026-02-07', 3, NOW(), NOW()),
(@company_id, @company_name, '1차 면접 합격', 'DATE_REPORTED', '2026-02-07', '2026-02-21', 2, NOW(), NOW()),
(@company_id, @company_name, '최종 합격', 'DATE_REPORTED', '2026-02-21', '2026-03-14', 2, NOW(), NOW()),
(@company_id, @company_name, '최종 합격', 'NO_RESPONSE_REPORTED', NULL, NULL, 1, NOW(), NOW());
