SET NAMES utf8mb4;
SET time_zone = '+09:00';

-- safe update mode 임시 해제
SET @OLD_SQL_SAFE_UPDATES := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- --------------------------------------------
-- 0) 테스트 유저 준비
-- --------------------------------------------
INSERT IGNORE INTO users (
  public_id, email, nickname, role, created_at, updated_at
) VALUES
  (UNHEX(REPLACE(UUID(), '-', '')), 'test_user1@whennawa.local', 'tester#10001', 'USER', NOW(), NOW()),
  (UNHEX(REPLACE(UUID(), '-', '')), 'test_user2@whennawa.local', 'tester#10002', 'USER', NOW(), NOW());

SELECT id INTO @u1 FROM users WHERE email = 'test_user1@whennawa.local' LIMIT 1;
SELECT id INTO @u2 FROM users WHERE email = 'test_user2@whennawa.local' LIMIT 1;

-- --------------------------------------------
-- 1) 회사 준비
-- --------------------------------------------
INSERT INTO company (company_name, is_active) VALUES
  ('[TEST]네이버', TRUE),
  ('[TEST]카카오', TRUE),
  ('[TEST]토스', TRUE),
  ('취업고민', TRUE)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

SELECT company_id INTO @c_nav   FROM company WHERE company_name='[TEST]네이버' LIMIT 1;
SELECT company_id INTO @c_kakao FROM company WHERE company_name='[TEST]카카오' LIMIT 1;
SELECT company_id INTO @c_toss  FROM company WHERE company_name='[TEST]토스' LIMIT 1;
SELECT company_id INTO @c_career FROM company WHERE company_name='취업고민' LIMIT 1;

-- --------------------------------------------
-- 2) 채널/스텝 준비
-- --------------------------------------------
INSERT INTO recruitment_channel (company_id, year, is_active) VALUES
  (@c_nav, 2026, TRUE),
  (@c_kakao, 2026, TRUE),
  (@c_toss, 2026, TRUE)
ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);

SELECT channel_id INTO @ch_nav FROM recruitment_channel WHERE company_id=@c_nav AND year=2026 LIMIT 1;
SELECT channel_id INTO @ch_kakao FROM recruitment_channel WHERE company_id=@c_kakao AND year=2026 LIMIT 1;
SELECT channel_id INTO @ch_toss FROM recruitment_channel WHERE company_id=@c_toss AND year=2026 LIMIT 1;

INSERT IGNORE INTO recruitment_step (channel_id, step_name) VALUES
  (@ch_nav, '서류'),
  (@ch_nav, '코딩테스트'),
  (@ch_nav, '1차 면접'),
  (@ch_nav, '최종 면접'),
  (@ch_kakao, '서류'),
  (@ch_kakao, '1차 면접'),
  (@ch_toss, '서류'),
  (@ch_toss, '직무 인터뷰');

-- --------------------------------------------
-- 3) 제보 데이터 (공채/수시 + 무응답)
-- --------------------------------------------
INSERT INTO step_date_report (
  company_id, company_name, recruitment_mode, rolling_result_type,
  reported_date, prev_reported_date, prev_step_name, current_step_name,
  report_count, status, created_at, updated_at
) VALUES
  (@c_nav, '[TEST]네이버', 'REGULAR', 'DATE_REPORTED',
   '2026-03-22', '2026-03-08', '코딩테스트', '1차 면접 결과 발표',
   3, 'PENDING', NOW(), NOW()),
  (@c_kakao, '[TEST]카카오', 'ROLLING', 'DATE_REPORTED',
   '2026-03-18', '2026-03-05', '서류', '1차 면접 결과 발표',
   2, 'PENDING', NOW(), NOW()),
  (@c_toss, '[TEST]토스', 'ROLLING', 'NO_RESPONSE_REPORTED',
   NULL, NULL, NULL, '직무 인터뷰 결과 미수신',
   1, 'PENDING', NOW(), NOW());

INSERT INTO rolling_step_log (
  company_id, company_name, current_step_name, rolling_result_type,
  recruitment_mode, source_type, prev_reported_date, reported_date,
  report_count, created_at, updated_at
) VALUES
  (@c_nav, '[TEST]네이버', '1차 면접 결과 발표', 'DATE_REPORTED',
   'REGULAR', 'REPORT', '2026-03-08', '2026-03-22', 3, NOW(), NOW()),
  (@c_kakao, '[TEST]카카오', '1차 면접 결과 발표', 'DATE_REPORTED',
   'ROLLING', 'REPORT', '2026-03-05', '2026-03-18', 2, NOW(), NOW()),
  (@c_toss, '[TEST]토스', '직무 인터뷰 결과 미수신', 'NO_RESPONSE_REPORTED',
   'ROLLING', 'REPORT', NULL, NULL, 1, NOW(), NOW());

-- --------------------------------------------
-- 4) 게시판 (회사별 + 취업고민) / 익명 / 댓글 / 답글 / 좋아요
-- --------------------------------------------
INSERT INTO board_post (
  company_id, user_id, title, content, is_anonymous, created_at, updated_at
) VALUES
  (@c_nav, @u1, '[TEST] 네이버 회사게시판 글(일반)', '회사게시판 일반 글 테스트', FALSE, NOW(), NOW()),
  (@c_nav, @u2, '[TEST] 네이버 회사게시판 글(익명)', '회사게시판 익명 글 테스트', TRUE, NOW(), NOW()),
  (@c_career, @u1, '[TEST] 취업고민 글(일반)', '취업고민 일반 글 테스트', FALSE, NOW(), NOW()),
  (@c_career, @u2, '[TEST] 취업고민 글(익명)', '취업고민 익명 글 테스트', TRUE, NOW(), NOW());

SELECT post_id INTO @p_nav_anon
FROM board_post
WHERE company_id=@c_nav AND title='[TEST] 네이버 회사게시판 글(익명)'
ORDER BY post_id DESC LIMIT 1;

INSERT INTO board_comment (
  post_id, parent_comment_id, user_id, content, is_anonymous, like_count, created_at, updated_at
) VALUES
  (@p_nav_anon, NULL, @u1, '루트 댓글(일반)', FALSE, 0, NOW(), NOW());

SELECT comment_id INTO @cm_root
FROM board_comment
WHERE post_id=@p_nav_anon AND parent_comment_id IS NULL
ORDER BY comment_id DESC LIMIT 1;

INSERT INTO board_comment (
  post_id, parent_comment_id, user_id, content, is_anonymous, like_count, created_at, updated_at
) VALUES
  (@p_nav_anon, @cm_root, @u2, '답글(익명)', TRUE, 0, NOW(), NOW());

INSERT IGNORE INTO board_comment_like (comment_id, user_id, created_at, updated_at)
VALUES (@cm_root, @u2, NOW(), NOW());

UPDATE board_comment
SET like_count = (
  SELECT COUNT(*) FROM board_comment_like l WHERE l.comment_id = @cm_root
),
updated_at = NOW()
WHERE comment_id = @cm_root;

-- --------------------------------------------
-- 5) 알림 구독/알림
-- --------------------------------------------
INSERT IGNORE INTO company_notification_subscription (
  company_id, user_id, created_at, updated_at
) VALUES
  (@c_nav, @u1, NOW(), NOW()),
  (@c_nav, @u2, NOW(), NOW()),
  (@c_kakao, @u1, NOW(), NOW());

INSERT INTO company_notification (
  user_id, company_id, event_date, first_reporter_nickname, reporter_message, reporter_count, is_read, created_at, updated_at
) VALUES
  (@u1, @c_nav, '2026-03-22', '익명#00001', '네이버 발표났어요', 3, FALSE, NOW(), NOW()),
  (@u2, @c_nav, '2026-03-22', '익명#00001', '네이버 발표났어요', 3, FALSE, NOW(), NOW()),
  (@u1, @c_kakao, '2026-03-18', '익명#00002', '카카오 발표났어요', 2, FALSE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  reporter_count = VALUES(reporter_count),
  reporter_message = VALUES(reporter_message),
  updated_at = NOW();

-- --------------------------------------------
-- 6) 채팅 (랜덤 닉네임 로직 확인용 기본 데이터)
-- --------------------------------------------
INSERT IGNORE INTO chat_room_member (company_id, user_id, nickname, created_at, updated_at)
VALUES
  (@c_nav, @u1, '익명#10001', NOW(), NOW()),
  (@c_nav, @u2, '익명#10002', NOW(), NOW());

SELECT member_id INTO @m1 FROM chat_room_member WHERE company_id=@c_nav AND user_id=@u1 LIMIT 1;
SELECT member_id INTO @m2 FROM chat_room_member WHERE company_id=@c_nav AND user_id=@u2 LIMIT 1;

INSERT INTO chat_message (company_id, member_id, sender_nickname, message, created_at, updated_at) VALUES
  (@c_nav, @m1, '익명#10001', '채팅 테스트 1', NOW(), NOW()),
  (@c_nav, @m2, '익명#10002', '채팅 테스트 2', NOW(), NOW());

COMMIT;

-- safe update mode 원복
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

-- ============================================
-- 검증 SELECT
-- ============================================
SELECT company_id, company_name, is_active
FROM company
WHERE company_name IN ('[TEST]네이버','[TEST]카카오','[TEST]토스','취업고민')
ORDER BY company_name;

SELECT company_name, recruitment_mode, rolling_result_type, prev_step_name, current_step_name, prev_reported_date, reported_date, status, report_count
FROM step_date_report
WHERE company_name LIKE '[TEST]%'
ORDER BY report_id DESC;

SELECT company_name, recruitment_mode, rolling_result_type, current_step_name, prev_reported_date, reported_date, report_count
FROM rolling_step_log
WHERE company_name LIKE '[TEST]%'
ORDER BY rolling_log_id DESC;

SELECT p.post_id, c.company_name, p.title, p.is_anonymous, p.user_id
FROM board_post p
JOIN company c ON c.company_id = p.company_id
WHERE c.company_name IN ('[TEST]네이버','취업고민')
ORDER BY p.post_id DESC;

SELECT bc.comment_id, bc.post_id, bc.parent_comment_id, bc.is_anonymous, bc.like_count, bc.content
FROM board_comment bc
WHERE bc.post_id = @p_nav_anon
ORDER BY bc.comment_id;

SELECT s.subscription_id, u.email, c.company_name
FROM company_notification_subscription s
JOIN users u ON u.id = s.user_id
JOIN company c ON c.company_id = s.company_id
WHERE c.company_name LIKE '[TEST]%'
ORDER BY s.subscription_id DESC;

SELECT n.notification_id, u.email, c.company_name, n.event_date, n.reporter_count, n.is_read
FROM company_notification n
JOIN users u ON u.id = n.user_id
JOIN company c ON c.company_id = n.company_id
WHERE c.company_name LIKE '[TEST]%'
ORDER BY n.notification_id DESC;

SELECT m.message_id, c.company_name, m.sender_nickname, m.message, m.created_at
FROM chat_message m
JOIN company c ON c.company_id = m.company_id
WHERE c.company_name='[TEST]네이버'
ORDER BY m.message_id DESC;
