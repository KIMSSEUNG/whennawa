/*
  Seed job categories and recruitment/rolling step master + pairs.
*/

INSERT IGNORE INTO job_category (name, is_active, created_at, updated_at) VALUES
('경영/사무', TRUE, NOW(), NOW()),
('마케팅/광고홍보', TRUE, NOW(), NOW()),
('무역유통', TRUE, NOW(), NOW()),
('IT/인터넷', TRUE, NOW(), NOW()),
('생산/제조', TRUE, NOW(), NOW()),
('영업/고객상담', TRUE, NOW(), NOW()),
('건설', TRUE, NOW(), NOW()),
('금융', TRUE, NOW(), NOW()),
('연구개발/설계', TRUE, NOW(), NOW()),
('디자인', TRUE, NOW(), NOW()),
('미디어', TRUE, NOW(), NOW()),
('전문특수직', TRUE, NOW(), NOW()),
('기타', TRUE, NOW(), NOW());

INSERT INTO recruitment_step_master (step_name, step_kind, is_active, created_at, updated_at)
SELECT seed.step_name, seed.step_kind, TRUE, NOW(), NOW()
FROM (
  SELECT '서류 지원' AS step_name, 'PREV' AS step_kind
  UNION ALL SELECT 'NCS 시험', 'PREV'
  UNION ALL SELECT '필기 전형', 'PREV'
  UNION ALL SELECT '인적성 검사', 'PREV'
  UNION ALL SELECT '코딩 테스트', 'PREV'
  UNION ALL SELECT '과제', 'PREV'
  UNION ALL SELECT '1차 면접', 'PREV'
  UNION ALL SELECT '2차 면접', 'PREV'
  UNION ALL SELECT '3차 면접', 'PREV'
  UNION ALL SELECT '실무진 면접', 'PREV'
  UNION ALL SELECT '기술 면접', 'PREV'
  UNION ALL SELECT '직무 면접', 'PREV'
  UNION ALL SELECT '임원 면접', 'PREV'
  UNION ALL SELECT 'PT 면접', 'PREV'
  UNION ALL SELECT '토론 면접', 'PREV'
  UNION ALL SELECT '최종 면접', 'PREV'
  UNION ALL SELECT '서류 발표', 'CURRENT'
  UNION ALL SELECT 'NCS 시험 발표', 'CURRENT'
  UNION ALL SELECT '필기 전형 발표', 'CURRENT'
  UNION ALL SELECT '인적성 검사 발표', 'CURRENT'
  UNION ALL SELECT '코딩 테스트 발표', 'CURRENT'
  UNION ALL SELECT '과제 발표', 'CURRENT'
  UNION ALL SELECT '1차 면접 발표', 'CURRENT'
  UNION ALL SELECT '2차 면접 발표', 'CURRENT'
  UNION ALL SELECT '3차 면접 발표', 'CURRENT'
  UNION ALL SELECT '실무진 면접 발표', 'CURRENT'
  UNION ALL SELECT '기술 면접 발표', 'CURRENT'
  UNION ALL SELECT '직무 면접 발표', 'CURRENT'
  UNION ALL SELECT '임원 면접 발표', 'CURRENT'
  UNION ALL SELECT 'PT 면접 발표', 'CURRENT'
  UNION ALL SELECT '토론 면접 발표', 'CURRENT'
  UNION ALL SELECT '최종 면접 발표', 'CURRENT'
  UNION ALL SELECT '최종 발표', 'CURRENT'
) seed
ON DUPLICATE KEY UPDATE
  step_kind = CASE
    WHEN recruitment_step_master.step_kind = VALUES(step_kind) THEN recruitment_step_master.step_kind
    WHEN recruitment_step_master.step_kind = 'BOTH' OR VALUES(step_kind) = 'BOTH' THEN 'BOTH'
    ELSE 'BOTH'
  END,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO recruitment_step_pair (company_job_category_id, prev_step_master_id, current_step_master_id, is_active, created_at, updated_at)
SELECT
  cjc.company_job_category_id,
  prev_m.step_master_id,
  curr_m.step_master_id,
  TRUE,
  NOW(),
  NOW()
FROM company_job_category cjc
JOIN (
  SELECT '서류 지원' AS prev_step_name, '서류 발표' AS current_step_name
  UNION ALL SELECT 'NCS 시험', 'NCS 시험 발표'
  UNION ALL SELECT '필기 전형', '필기 전형 발표'
  UNION ALL SELECT '인적성 검사', '인적성 검사 발표'
  UNION ALL SELECT '코딩 테스트', '코딩 테스트 발표'
  UNION ALL SELECT '과제', '과제 발표'
  UNION ALL SELECT '1차 면접', '1차 면접 발표'
  UNION ALL SELECT '2차 면접', '2차 면접 발표'
  UNION ALL SELECT '3차 면접', '3차 면접 발표'
  UNION ALL SELECT '실무진 면접', '실무진 면접 발표'
  UNION ALL SELECT '기술 면접', '기술 면접 발표'
  UNION ALL SELECT '직무 면접', '직무 면접 발표'
  UNION ALL SELECT '임원 면접', '임원 면접 발표'
  UNION ALL SELECT 'PT 면접', 'PT 면접 발표'
  UNION ALL SELECT '토론 면접', '토론 면접 발표'
  UNION ALL SELECT '최종 면접', '최종 발표'
) seed ON 1 = 1
JOIN recruitment_step_master prev_m ON prev_m.step_name = seed.prev_step_name
JOIN recruitment_step_master curr_m ON curr_m.step_name = seed.current_step_name
WHERE cjc.is_active = TRUE
ON DUPLICATE KEY UPDATE
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO rolling_step_master (step_name, step_kind, is_active, created_at, updated_at)
SELECT rsm.step_name, rsm.step_kind, rsm.is_active, NOW(), NOW()
FROM recruitment_step_master rsm
ON DUPLICATE KEY UPDATE
  step_kind = CASE
    WHEN rolling_step_master.step_kind = VALUES(step_kind) THEN rolling_step_master.step_kind
    WHEN rolling_step_master.step_kind = 'BOTH' OR VALUES(step_kind) = 'BOTH' THEN 'BOTH'
    ELSE 'BOTH'
  END,
  is_active = VALUES(is_active),
  updated_at = NOW();

INSERT INTO rolling_step_pair (
  company_job_category_id,
  prev_rolling_step_master_id,
  current_rolling_step_master_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  rp.company_job_category_id,
  prev_rm.rolling_step_master_id,
  curr_rm.rolling_step_master_id,
  rp.is_active,
  NOW(),
  NOW()
FROM recruitment_step_pair rp
JOIN recruitment_step_master prev_sm ON prev_sm.step_master_id = rp.prev_step_master_id
JOIN recruitment_step_master curr_sm ON curr_sm.step_master_id = rp.current_step_master_id
JOIN rolling_step_master prev_rm ON prev_rm.step_name = prev_sm.step_name
JOIN rolling_step_master curr_rm ON curr_rm.step_name = curr_sm.step_name
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active),
  updated_at = NOW();

INSERT IGNORE INTO users (
  public_id,
  email,
  nickname,
  role,
  created_at,
  updated_at
) VALUES (
  UNHEX(REPLACE(UUID(), '-', '')),
  'whennawa@gmail.com',
  'admin#00001',
  'ADMIN',
  NOW(),
  NOW()
);
