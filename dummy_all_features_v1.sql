SET SQL_SAFE_UPDATES = 0;

SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO users (public_id, email, nickname, role, created_at, updated_at)
VALUES
  (UNHEX(REPLACE(UUID(), '-', '')), 'admin.demo@whennawa.local', 'admin#90001', 'ADMIN', NOW(), NOW()),
  (UNHEX(REPLACE(UUID(), '-', '')), 'user1.demo@whennawa.local', 'dev#12001', 'USER', NOW(), NOW()),
  (UNHEX(REPLACE(UUID(), '-', '')), 'user2.demo@whennawa.local', 'job#12002', 'USER', NOW(), NOW()),
  (UNHEX(REPLACE(UUID(), '-', '')), 'user3.demo@whennawa.local', 'prep#12003', 'USER', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  role = VALUES(role),
  updated_at = NOW();

SELECT id INTO @u_admin FROM users WHERE email = 'admin.demo@whennawa.local' LIMIT 1;
SELECT id INTO @u1 FROM users WHERE email = 'user1.demo@whennawa.local' LIMIT 1;
SELECT id INTO @u2 FROM users WHERE email = 'user2.demo@whennawa.local' LIMIT 1;
SELECT id INTO @u3 FROM users WHERE email = 'user3.demo@whennawa.local' LIMIT 1;

INSERT INTO company (company_name, is_active) VALUES
  ('네이버', TRUE),
  ('카카오', TRUE),
  ('토스', TRUE),
  ('당근', TRUE),
  ('취업고민', TRUE)
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active);

SELECT company_id INTO @c_naver FROM company WHERE company_name = '네이버' LIMIT 1;
SELECT company_id INTO @c_kakao FROM company WHERE company_name = '카카오' LIMIT 1;
SELECT company_id INTO @c_toss FROM company WHERE company_name = '토스' LIMIT 1;
SELECT company_id INTO @c_daangn FROM company WHERE company_name = '당근' LIMIT 1;
SELECT company_id INTO @c_career FROM company WHERE company_name = '취업고민' LIMIT 1;

DELETE FROM board_comment_like
WHERE comment_id IN (
  SELECT c.comment_id
  FROM board_comment c
  JOIN board_post p ON p.post_id = c.post_id
  WHERE p.company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn, @c_career)
);

DELETE FROM board_comment
WHERE post_id IN (
  SELECT post_id
  FROM board_post
  WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn, @c_career)
);

DELETE FROM board_post
WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn, @c_career);

DELETE FROM company_notification
WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn)
  OR user_id IN (@u_admin, @u1, @u2, @u3);

DELETE FROM company_notification_subscription
WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn)
  OR user_id IN (@u_admin, @u1, @u2, @u3);

DELETE FROM step_date_report
WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn)
   OR company_name IN ('네이버', '카카오', '토스', '당근');

DELETE FROM rolling_step_log
WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn)
   OR company_name IN ('네이버', '카카오', '토스', '당근');

DELETE FROM recruitment_step
WHERE channel_id IN (
  SELECT channel_id
  FROM recruitment_channel
  WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn)
);

DELETE FROM recruitment_channel
WHERE company_id IN (@c_naver, @c_kakao, @c_toss, @c_daangn);

INSERT INTO recruitment_channel (company_id, year, is_active)
VALUES
  (@c_naver, 2026, TRUE),
  (@c_kakao, 2026, TRUE),
  (@c_toss, 2026, TRUE),
  (@c_daangn, 2026, TRUE)
ON DUPLICATE KEY UPDATE
  is_active = VALUES(is_active);

SELECT channel_id INTO @ch_naver FROM recruitment_channel WHERE company_id = @c_naver AND year = 2026 LIMIT 1;
SELECT channel_id INTO @ch_kakao FROM recruitment_channel WHERE company_id = @c_kakao AND year = 2026 LIMIT 1;
SELECT channel_id INTO @ch_toss FROM recruitment_channel WHERE company_id = @c_toss AND year = 2026 LIMIT 1;
SELECT channel_id INTO @ch_daangn FROM recruitment_channel WHERE company_id = @c_daangn AND year = 2026 LIMIT 1;

INSERT INTO recruitment_step (channel_id, step_name)
VALUES
  (@ch_naver, '서류'),
  (@ch_naver, '서류 합격'),
  (@ch_naver, '1차 면접'),
  (@ch_naver, '1차 면접 합격'),
  (@ch_naver, '최종 면접'),
  (@ch_naver, '최종 합격'),
  (@ch_kakao, '서류'),
  (@ch_kakao, '코딩테스트'),
  (@ch_kakao, '1차 면접'),
  (@ch_kakao, '최종 합격'),
  (@ch_toss, '지원'),
  (@ch_toss, '과제'),
  (@ch_toss, '직무 인터뷰'),
  (@ch_toss, '합격'),
  (@ch_daangn, '지원'),
  (@ch_daangn, '화상 면접'),
  (@ch_daangn, '최종 면접'),
  (@ch_daangn, '최종 합격')
ON DUPLICATE KEY UPDATE
  step_name = VALUES(step_name);

INSERT INTO step_date_report
(
  company_id, company_name, recruitment_mode, rolling_result_type,
  reported_date, prev_reported_date, prev_step_name, current_step_name,
  report_count, status, deleted_at, created_at, updated_at
)
VALUES
  (@c_naver, '네이버', 'REGULAR', NULL, '2026-02-24', '2026-02-17', '1차 면접', '1차 면접 합격', 5, 'PENDING', NULL, NOW(), NOW()),
  (@c_naver, '네이버', 'REGULAR', NULL, '2026-02-20', '2026-02-10', '서류', '서류 합격', 2, 'PROCESSED', '2026-02-20 12:00:00', NOW(), NOW()),
  (@c_kakao, '카카오', 'REGULAR', NULL, '2026-02-22', '2026-02-14', '코딩테스트', '1차 면접', 4, 'PENDING', NULL, NOW(), NOW()),
  (@c_kakao, '카카오', 'REGULAR', NULL, '2026-02-18', '2026-02-08', '서류', '코딩테스트', 2, 'PROCESSED', '2026-02-18 10:00:00', NOW(), NOW()),
  (@c_toss, '토스', 'REGULAR', NULL, '2026-02-21', '2026-02-11', '과제', '직무 인터뷰', 3, 'PENDING', NULL, NOW(), NOW()),
  (@c_daangn, '당근', 'REGULAR', NULL, '2026-02-19', '2026-02-09', '화상 면접', '최종 면접', 2, 'PENDING', NULL, NOW(), NOW()),
  (@c_kakao, '카카오', 'REGULAR', NULL, NULL, NULL, NULL, '코딩테스트', 1, 'PENDING', NULL, NOW(), NOW()),
  (@c_toss, '토스', 'ROLLING', 'DATE_REPORTED', '2026-02-23', '2026-02-14', '과제', '직무 인터뷰', 3, 'PENDING', NULL, NOW(), NOW()),
  (@c_toss, '토스', 'ROLLING', 'NO_RESPONSE_REPORTED', NULL, NULL, NULL, '직무 인터뷰', 2, 'PENDING', NULL, NOW(), NOW()),
  (@c_daangn, '당근', 'ROLLING', 'DATE_REPORTED', '2026-02-16', '2026-02-06', '화상 면접', '최종 면접', 1, 'DISCARDED', '2026-02-16 13:00:00', NOW(), NOW());

INSERT INTO rolling_step_log
(
  company_id, company_name, current_step_name, rolling_result_type, source_type,
  prev_reported_date, reported_date, report_count, created_at, updated_at
)
VALUES
  (@c_naver, '네이버', '서류 합격', 'DATE_REPORTED', 'REPORT', '2026-01-05', '2026-01-12', 4, NOW(), NOW()),
  (@c_naver, '네이버', '1차 면접 합격', 'DATE_REPORTED', 'REPORT', '2026-01-20', '2026-01-29', 3, NOW(), NOW()),
  (@c_kakao, '카카오', '1차 면접', 'DATE_REPORTED', 'OFFICIAL', '2026-01-14', '2026-01-24', 2, NOW(), NOW()),
  (@c_toss, '토스', '직무 인터뷰', 'NO_RESPONSE_REPORTED', 'REPORT', NULL, NULL, 2, NOW(), NOW()),
  (@c_daangn, '당근', '최종 합격', 'DATE_REPORTED', 'REPORT', '2026-02-01', '2026-02-10', 5, NOW(), NOW());

INSERT INTO board_post (company_id, user_id, title, content, created_at, updated_at)
SELECT
  @c_naver,
  CASE WHEN MOD(n, 3) = 0 THEN @u1 WHEN MOD(n, 3) = 1 THEN @u2 ELSE @u3 END,
  CONCAT('[더미] 네이버 회사게시판 글 ', LPAD(n, 2, '0')),
  CONCAT('네이버 게시판 더미 본문 ', n, '번입니다. 검색/페이지네이션/상세 이동 테스트용 내용입니다.'),
  DATE_SUB(NOW(), INTERVAL n HOUR),
  DATE_SUB(NOW(), INTERVAL n HOUR)
FROM (
  SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
  UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
  UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
  UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
) AS seq;

INSERT INTO board_post (company_id, user_id, title, content, created_at, updated_at)
SELECT
  @c_career,
  CASE WHEN MOD(n, 2) = 0 THEN @u1 ELSE @u2 END,
  CONCAT('[더미] 취업고민 글 ', LPAD(n, 2, '0')),
  CONCAT('취업고민 게시판 더미 본문 ', n, '번입니다. 진로/이직/면접 고민을 공유하는 테스트 데이터입니다.'),
  DATE_SUB(NOW(), INTERVAL n DAY),
  DATE_SUB(NOW(), INTERVAL n DAY)
FROM (
  SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
  UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
  UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
  UNION ALL SELECT 21 UNION ALL SELECT 22
) AS seq;

SELECT post_id INTO @p_naver_main
FROM board_post
WHERE company_id = @c_naver AND title = '[더미] 네이버 회사게시판 글 01'
LIMIT 1;

INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at)
VALUES
  (@p_naver_main, NULL, @u1, '루트 댓글(1단계): 네이버 준비 중입니다.', 0, NOW(), NOW()),
  (@p_naver_main, NULL, @u2, REPEAT('A', 620), 0, NOW(), NOW());

SELECT comment_id INTO @cmt_l1
FROM board_comment
WHERE post_id = @p_naver_main AND parent_comment_id IS NULL AND user_id = @u1
ORDER BY comment_id DESC LIMIT 1;

SELECT comment_id INTO @cmt_l1_long
FROM board_comment
WHERE post_id = @p_naver_main AND parent_comment_id IS NULL AND user_id = @u2
ORDER BY comment_id DESC LIMIT 1;

INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at)
VALUES
  (@p_naver_main, @cmt_l1, @u2, '대댓글(2단계): 저도 같은 일정으로 준비 중이에요.', 0, NOW(), NOW());

SELECT comment_id INTO @cmt_l2
FROM board_comment
WHERE post_id = @p_naver_main AND parent_comment_id = @cmt_l1 AND user_id = @u2
ORDER BY comment_id DESC LIMIT 1;

INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at)
VALUES
  (@p_naver_main, @cmt_l2, @u3, '3단계 댓글: 자료 공유 감사합니다.', 0, NOW(), NOW());

INSERT INTO board_comment_like (comment_id, user_id, created_at, updated_at)
VALUES
  (@cmt_l1, @u2, NOW(), NOW()),
  (@cmt_l1, @u3, NOW(), NOW()),
  (@cmt_l2, @u1, NOW(), NOW()),
  (@cmt_l1_long, @u1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  updated_at = NOW();

UPDATE board_comment c
SET c.like_count = (
  SELECT COUNT(*)
  FROM board_comment_like l
  WHERE l.comment_id = c.comment_id
)
WHERE c.post_id = @p_naver_main;

INSERT INTO company_notification_subscription (company_id, user_id, created_at, updated_at)
VALUES
  (@c_naver, @u1, NOW(), NOW()),
  (@c_naver, @u2, NOW(), NOW()),
  (@c_naver, @u3, NOW(), NOW()),
  (@c_kakao, @u1, NOW(), NOW()),
  (@c_toss, @u2, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  updated_at = NOW();

INSERT INTO company_notification
(
  user_id, company_id, event_date, first_reporter_nickname,
  reporter_message, reporter_count, is_read, created_at, updated_at
)
VALUES
  (@u1, @c_naver, '2026-02-24', 'dev#12001', '오늘 오후 2시에 결과 메일 확인했어요.', 5, FALSE, NOW(), NOW()),
  (@u2, @c_naver, '2026-02-24', 'dev#12001', '오늘 오후 2시에 결과 메일 확인했어요.', 5, FALSE, NOW(), NOW()),
  (@u3, @c_naver, '2026-02-24', 'dev#12001', '오늘 오후 2시에 결과 메일 확인했어요.', 5, TRUE, NOW(), NOW()),
  (@u1, @c_kakao, '2026-02-23', 'job#12002', NULL, 1, FALSE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  first_reporter_nickname = VALUES(first_reporter_nickname),
  reporter_message = VALUES(reporter_message),
  reporter_count = VALUES(reporter_count),
  is_read = VALUES(is_read),
  updated_at = NOW();

COMMIT;

SELECT c.company_name, COUNT(*) AS post_count
FROM board_post p
JOIN company c ON c.company_id = p.company_id
WHERE p.company_id IN (@c_naver, @c_career)
GROUP BY c.company_name
ORDER BY c.company_name;

SELECT company_name, current_step_name, report_count
FROM rolling_step_log
WHERE company_name IN ('네이버', '카카오', '토스', '당근')
ORDER BY company_name, current_step_name;

SELECT n.company_id, c.company_name, n.event_date, n.first_reporter_nickname, n.reporter_count, n.is_read
FROM company_notification n
JOIN company c ON c.company_id = n.company_id
WHERE n.user_id = @u1
ORDER BY n.updated_at DESC;

SET SQL_SAFE_UPDATES = 1;
