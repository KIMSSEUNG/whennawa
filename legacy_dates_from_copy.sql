-- =====================================================
-- Legacy date rows restored from readonly copy file
-- Source: insertCompany_test - ???.sql (read-only)
-- =====================================================

-- Ensure legacy companies exist
INSERT INTO company (company_name, is_active) VALUES ('KB국민은행', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('네이버', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('삼성SDS', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('삼성전자', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('새마을금고중앙회', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('우아한형제들', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('카카오', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;
INSERT INTO company (company_name, is_active) VALUES ('행복나래', TRUE) ON DUPLICATE KEY UPDATE is_active = TRUE;

-- Legacy company id variables
SET @baemin_id = (SELECT company_id FROM company WHERE company_name = '우아한형제들' LIMIT 1);
SET @hn_id = (SELECT company_id FROM company WHERE company_name = '행복나래' LIMIT 1);
SET @kakao_id = (SELECT company_id FROM company WHERE company_name = '카카오' LIMIT 1);
SET @kb_id = (SELECT company_id FROM company WHERE company_name = 'KB국민은행' LIMIT 1);
SET @kfcc_id = (SELECT company_id FROM company WHERE company_name = '새마을금고중앙회' LIMIT 1);
SET @naver_id = (SELECT company_id FROM company WHERE company_name = '네이버' LIMIT 1);
SET @samsung_id = (SELECT company_id FROM company WHERE company_name = '삼성전자' LIMIT 1);
SET @sds_id = (SELECT company_id FROM company WHERE company_name = '삼성SDS' LIMIT 1);

-- Legacy rolling_step_log date inserts
INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
VALUES 
-- 1. 서류 발표 (실측: 03/18 접수 마감 -> 04/05(금) 발표)
(@samsung_id, '삼성전자', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-18', '2024-04-05', 1, NOW(), NOW()),

-- 2. GSAT 시험 발표 (실측: 04/28 시험 종료 -> 05/10(금) 발표)
(@samsung_id, '삼성전자', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-28', '2024-05-10', 1, NOW(), NOW()),

-- 3. 최종 발표 (실측: 5월 말 면접 종료 -> 06/11(화) 발표)
(@samsung_id, '삼성전자', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-31', '2024-06-11', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-09-11', '2024-10-08', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2024-10-08' AND current_step_name = '서류 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-10-27', '2024-11-08', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2024-11-08' AND current_step_name = 'GSAT 시험 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', 'SW 역량 테스트 발표', 'SW 역량 테스트', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-10-27', '2024-11-08', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2024-11-08' AND current_step_name = 'SW 역량 테스트 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-11-29', '2024-12-13', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2024-12-13' AND current_step_name = '최종 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-09-18', '2023-10-06', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2023-10-06' AND current_step_name = '서류 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-10-29', '2023-11-10', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2023-11-10' AND current_step_name = 'GSAT 시험 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', 'SW 역량 테스트 발표', 'SW 역량 테스트', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-10-29', '2023-11-10', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2023-11-10' AND current_step_name = 'SW 역량 테스트 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @samsung_id, '삼성전자', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-12-01', '2023-12-15', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성전자' AND reported_date = '2023-12-15' AND current_step_name = '최종 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @sds_id, '삼성SDS', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-09-11', '2024-10-11', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성SDS' AND reported_date = '2024-10-11' AND current_step_name = '서류 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @sds_id, '삼성SDS', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-10-26', '2024-11-06', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성SDS' AND reported_date = '2024-11-06' AND current_step_name = 'GSAT 시험 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @sds_id, '삼성SDS', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-11-21', '2024-12-06', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '삼성SDS' AND reported_date = '2024-12-06' AND current_step_name = '최종 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
VALUES
(@sds_id, '삼성SDS', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-18', '2024-04-05', 1, NOW(), NOW()),
(@sds_id, '삼성SDS', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-28', '2024-05-08', 1, NOW(), NOW()),
(@sds_id, '삼성SDS', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-31', '2024-06-11', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
VALUES 
(@sds_id, '삼성SDS', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-09-18', '2023-10-06', 1, NOW(), NOW()),
(@sds_id, '삼성SDS', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-10-29', '2023-11-08', 1, NOW(), NOW()),
(@sds_id, '삼성SDS', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2023-12-01', '2023-12-12', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
VALUES 
(@sds_id, '삼성SDS', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2022-09-14', '2022-10-05', 1, NOW(), NOW()),
(@sds_id, '삼성SDS', 'GSAT 시험 발표', 'GSAT 시험', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2022-10-23', '2022-11-01', 1, NOW(), NOW()),
(@sds_id, '삼성SDS', '최종 발표', '최종 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2022-11-25', '2022-12-09', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
VALUES 
(@kfcc_id, '새마을금고중앙회', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-02-10', '2025-02-20', 1, NOW(), NOW()),
(@kfcc_id, '새마을금고중앙회', '필기 전형 발표', '필기 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-02-22', '2025-02-26', 1, NOW(), NOW()),
(@kfcc_id, '새마을금고중앙회', '1차 면접 발표', '1차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-04', '2025-03-11', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
VALUES 
(@hn_id, '행복나래', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-09-03', '2025-09-08', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-16', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-05-03' AND current_step_name = '서류 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '필기 전형 발표', '필기 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-12', '2024-05-20', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-05-20' AND current_step_name = '필기 전형 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '1차 면접 발표', '1차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-31', '2024-06-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-06-07' AND current_step_name = '1차 면접 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '최종 발표', '2차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-06-21', '2024-06-28', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-06-28' AND current_step_name = '최종 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-09-23', '2024-10-11', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-10-11' AND current_step_name = '서류 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '필기 전형 발표', '필기 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-10-20', '2024-10-25', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-10-25' AND current_step_name = '필기 전형 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '1차 면접 발표', '1차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-11-07', '2024-11-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-11-14' AND current_step_name = '1차 면접 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kb_id, 'KB국민은행', '최종 발표', '2차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-11-26', '2024-12-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = 'KB국민은행' AND reported_date = '2024-12-03' AND current_step_name = '최종 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '서류 전형 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-18', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2024-04-09' AND current_step_name = '서류 전형 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-24', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2024-04-09' AND current_step_name = '기업문화 적합도 검사 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-26', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2024-05-03' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '챌린지 전형 발표', '챌린지 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-31', '2024-06-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2024-06-07' AND current_step_name = '챌린지 전형 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '종합 역량 인터뷰 발표', '종합 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-06-07', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2024-06-14' AND current_step_name = '종합 역량 인터뷰 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '서류 전형 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-17', '2025-04-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2025-04-07' AND current_step_name = '서류 전형 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-25', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2025-05-07' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '종합 역량 인터뷰 발표', '종합 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-06-13', '2025-06-23', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND reported_date = '2025-06-23' AND current_step_name = '종합 역량 인터뷰 발표');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-18', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '서류 발표' AND reported_date = '2024-04-09');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기술역량 인터뷰 결과 발표', '기술역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-26', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기술역량 인터뷰 결과 발표' AND reported_date = '2024-05-03' AND prev_reported_date = '2024-04-26');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기술역량 인터뷰 결과 발표', '기술역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-16', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기술역량 인터뷰 결과 발표' AND reported_date = '2024-05-03' AND prev_reported_date = '2024-04-16');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '최종 발표', '종합역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-29', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '최종 발표' AND reported_date = '2024-06-14' AND prev_reported_date = '2024-05-29');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '최종 발표', '종합역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-16', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '최종 발표' AND reported_date = '2024-06-14' AND prev_reported_date = '2024-05-16');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '서류 발표', '서류 지원', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-17', '2025-04-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '서류 발표' AND reported_date = '2025-04-07');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기술역량 인터뷰 결과 발표', '기술역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-25', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기술역량 인터뷰 결과 발표' AND reported_date = '2025-05-07' AND prev_reported_date = '2025-04-25');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기술역량 인터뷰 결과 발표', '기술역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-15', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기술역량 인터뷰 결과 발표' AND reported_date = '2025-05-07' AND prev_reported_date = '2025-04-15');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-24', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2024-04-09' AND prev_reported_date = '2024-03-24');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-22', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2024-04-09' AND prev_reported_date = '2024-03-22');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-26', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표' AND reported_date = '2024-05-03' AND prev_reported_date = '2024-04-26');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-15', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표' AND reported_date = '2024-05-03' AND prev_reported_date = '2024-04-15');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '챌린지 전형 발표', '챌린지 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-31', '2024-06-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '챌린지 전형 발표' AND reported_date = '2024-06-07' AND prev_reported_date = '2024-05-31');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '챌린지 전형 발표', '챌린지 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-06', '2024-06-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '챌린지 전형 발표' AND reported_date = '2024-06-07' AND prev_reported_date = '2024-05-06');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '최종 발표', '종합 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-06-07', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '최종 발표' AND reported_date = '2024-06-14' AND prev_reported_date = '2024-06-07');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '최종 발표', '종합 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-27', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '최종 발표' AND reported_date = '2024-06-14' AND prev_reported_date = '2024-05-27');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-23', '2025-04-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2025-04-07' AND prev_reported_date = '2025-03-23');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-21', '2025-04-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2025-04-07' AND prev_reported_date = '2025-03-21');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-25', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표' AND reported_date = '2025-05-07' AND prev_reported_date = '2025-04-25');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-14', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표' AND reported_date = '2025-05-07' AND prev_reported_date = '2025-04-14');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-24', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2024-04-09' AND prev_reported_date = '2024-03-24');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-03-22', '2024-04-09', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2024-04-09' AND prev_reported_date = '2024-03-22');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '직무 역량 인터뷰 발표', '직무 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-26', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '직무 역량 인터뷰 발표' AND reported_date = '2024-05-03' AND prev_reported_date = '2024-04-26');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '직무 역량 인터뷰 발표', '직무 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-04-15', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '직무 역량 인터뷰 발표' AND reported_date = '2024-05-03' AND prev_reported_date = '2024-04-15');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '챌린지 전형 발표', '챌린지 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-31', '2024-06-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '챌린지 전형 발표' AND reported_date = '2024-06-07' AND prev_reported_date = '2024-05-31');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '챌린지 전형 발표', '챌린지 전형', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-06', '2024-06-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '챌린지 전형 발표' AND reported_date = '2024-06-07' AND prev_reported_date = '2024-05-06');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '최종 발표', '종합 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-06-07', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '최종 발표' AND reported_date = '2024-06-14' AND prev_reported_date = '2024-06-07');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '최종 발표', '종합 역량 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2024-05-27', '2024-06-14', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '최종 발표' AND reported_date = '2024-06-14' AND prev_reported_date = '2024-05-27');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-23', '2025-04-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2025-04-07' AND prev_reported_date = '2025-03-23');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '기업문화 적합도 검사 발표', '기업문화 적합도 검사', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-03-21', '2025-04-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '기업문화 적합도 검사 발표' AND reported_date = '2025-04-07' AND prev_reported_date = '2025-03-21');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-25', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표' AND reported_date = '2025-05-07' AND prev_reported_date = '2025-04-25');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @naver_id, '네이버', '프로덕트 디벨롭 인터뷰 발표', '프로덕트 디벨롭 인터뷰', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-04-14', '2025-05-07', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '네이버' AND current_step_name = '프로덕트 디벨롭 인터뷰 발표' AND reported_date = '2025-05-07' AND prev_reported_date = '2025-04-14');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '서류 및 코딩테스트 결과 발표', '서류 지원', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2023-11-20', '2023-12-06', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '서류 및 코딩테스트 결과 발표' AND reported_date = '2023-12-06' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '인터뷰 결과 발표', '인터뷰', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2023-12-15', '2023-12-22', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '인터뷰 결과 발표' AND prev_reported_date = '2023-12-15' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '인터뷰 결과 발표', '인터뷰', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2023-12-11', '2023-12-22', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '인터뷰 결과 발표' AND prev_reported_date = '2023-12-11' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '최종 합격 발표', '전환 면접', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-03-08', '2024-03-12', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '최종 합격 발표' AND prev_reported_date = '2024-03-08' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '최종 합격 발표', '전환 면접', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-03-04', '2024-03-12', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '최종 합격 발표' AND prev_reported_date = '2024-03-04' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '1차 코딩 테스트 발표', '1차 코딩 테스트', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-10-11', '2025-10-21', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '1차 코딩 테스트 발표' AND reported_date = '2025-10-21' AND recruitment_mode = 'REGULAR');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '2차 코딩 테스트 발표', '2차 코딩 테스트', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-11-01', '2025-11-11', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '2차 코딩 테스트 발표' AND reported_date = '2025-11-11' AND recruitment_mode = 'REGULAR');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '1차 면접 발표', '1차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-11-17', '2025-12-05', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '1차 면접 발표' AND prev_reported_date = '2025-11-17' AND recruitment_mode = 'REGULAR');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '1차 면접 발표', '1차 면접', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-11-28', '2025-12-05', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '1차 면접 발표' AND prev_reported_date = '2025-11-28' AND recruitment_mode = 'REGULAR');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @kakao_id, '카카오', '최종 합격 발표', '1차 면접 발표', 'DATE_REPORTED', 'REGULAR', 'OFFICIAL', '2025-12-05', '2025-12-17', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '카카오' AND current_step_name = '최종 합격 발표' AND reported_date = '2025-12-17' AND recruitment_mode = 'REGULAR');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @baemin_id, '우아한형제들', '1차 코딩 테스트 발표', '1차 코딩 테스트', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-04-27', '2024-05-03', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '우아한형제들' AND current_step_name = '1차 코딩 테스트 발표' AND reported_date = '2024-05-03' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @baemin_id, '우아한형제들', '2차 코딩 테스트 발표', '2차 코딩 테스트(과제)', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-05-04', '2024-05-17', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '우아한형제들' AND current_step_name = '2차 코딩 테스트 발표' AND reported_date = '2024-05-17' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @baemin_id, '우아한형제들', '캠프 합격 발표', '인터뷰', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-05-22', '2024-06-05', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '우아한형제들' AND current_step_name = '캠프 합격 발표' AND prev_reported_date = '2024-05-22' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @baemin_id, '우아한형제들', '캠프 합격 발표', '인터뷰', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-05-24', '2024-06-05', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '우아한형제들' AND current_step_name = '캠프 합격 발표' AND prev_reported_date = '2024-05-24' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @baemin_id, '우아한형제들', '최종 합격 발표', '전환 인터뷰', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-08-26', '2024-09-06', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '우아한형제들' AND current_step_name = '최종 합격 발표' AND prev_reported_date = '2024-08-26' AND recruitment_mode = 'INTERN');

INSERT INTO recruitment_step_log (company_id, company_name, current_step_name, prev_step_name, result_type, recruitment_mode, source_type, prev_reported_date, reported_date, report_count, created_at, updated_at)
SELECT @baemin_id, '우아한형제들', '최종 합격 발표', '전환 인터뷰', 'DATE_REPORTED', 'INTERN', 'OFFICIAL', '2024-08-28', '2024-09-06', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recruitment_step_log WHERE company_name = '우아한형제들' AND current_step_name = '최종 합격 발표' AND prev_reported_date = '2024-08-28' AND recruitment_mode = 'INTERN');


