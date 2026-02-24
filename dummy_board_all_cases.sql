-- Board dummy data: posts + comments + replies(3-level max) + likes + pagination/search cases
-- DB: MySQL / MariaDB (H2 MODE=MySQL also compatible)

-- ------------------------------------------------------------
-- 1) users
-- ------------------------------------------------------------
INSERT IGNORE INTO users (public_id, email, role, created_at, updated_at) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), 'board_admin@example.com', 'ADMIN', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'board_user_a@example.com', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'board_user_b@example.com', 'USER', NOW(), NOW()),
(UNHEX(REPLACE(UUID(), '-', '')), 'board_user_c@example.com', 'USER', NOW(), NOW());

SET @admin_id  = (SELECT id FROM users WHERE email = 'board_admin@example.com');
SET @user_a_id = (SELECT id FROM users WHERE email = 'board_user_a@example.com');
SET @user_b_id = (SELECT id FROM users WHERE email = 'board_user_b@example.com');
SET @user_c_id = (SELECT id FROM users WHERE email = 'board_user_c@example.com');

-- ------------------------------------------------------------
-- 2) companies
-- ------------------------------------------------------------
INSERT IGNORE INTO company (company_name, is_active) VALUES
('테스트전자', TRUE),
('샘플소프트', TRUE),
('더미모빌리티', TRUE);

SET @company_test     = (SELECT company_id FROM company WHERE company_name = '테스트전자');
SET @company_sample   = (SELECT company_id FROM company WHERE company_name = '샘플소프트');
SET @company_mobility = (SELECT company_id FROM company WHERE company_name = '더미모빌리티');

-- ------------------------------------------------------------
-- 3) posts (pagination/search validation)
-- ------------------------------------------------------------
INSERT INTO board_post (company_id, user_id, title, content, created_at, updated_at) VALUES
(@company_test, @user_a_id, '테스트전자 면접 후기 01', '서류 합격 후 1차 면접 후기입니다.', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(@company_test, @user_b_id, '테스트전자 면접 후기 02', '코딩테스트 난이도는 중상 정도였습니다.', NOW() - INTERVAL 23 HOUR, NOW() - INTERVAL 23 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 03', '포트폴리오 기반 질문이 많았습니다.', NOW() - INTERVAL 22 HOUR, NOW() - INTERVAL 22 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 04', '면접관 3:지원자 1 구조였습니다.', NOW() - INTERVAL 21 HOUR, NOW() - INTERVAL 21 HOUR),
(@company_test, @user_b_id, '테스트전자 면접 후기 05', '역량면접/인성면접 분리 진행', NOW() - INTERVAL 20 HOUR, NOW() - INTERVAL 20 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 06', '결과 안내는 약 8일 소요', NOW() - INTERVAL 19 HOUR, NOW() - INTERVAL 19 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 07', '기술 꼬리질문 다수', NOW() - INTERVAL 18 HOUR, NOW() - INTERVAL 18 HOUR),
(@company_test, @user_b_id, '테스트전자 면접 후기 08', '협업/갈등 해결 경험 질문', NOW() - INTERVAL 17 HOUR, NOW() - INTERVAL 17 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 09', '구현+자료구조 위주', NOW() - INTERVAL 16 HOUR, NOW() - INTERVAL 16 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 10', '대기 시간 짧고 안내 친절', NOW() - INTERVAL 15 HOUR, NOW() - INTERVAL 15 HOUR),
(@company_test, @user_b_id, '테스트전자 면접 후기 11', '프로젝트 책임 범위 질문', NOW() - INTERVAL 14 HOUR, NOW() - INTERVAL 14 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 12', '코딩테스트 후 바로 기술면접', NOW() - INTERVAL 13 HOUR, NOW() - INTERVAL 13 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 13', '인덱스/트랜잭션 질문', NOW() - INTERVAL 12 HOUR, NOW() - INTERVAL 12 HOUR),
(@company_test, @user_b_id, '테스트전자 면접 후기 14', '피드백이 구체적이었습니다.', NOW() - INTERVAL 11 HOUR, NOW() - INTERVAL 11 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 15', '연차 맞춤형 질문 느낌', NOW() - INTERVAL 10 HOUR, NOW() - INTERVAL 10 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 16', '문자열 파싱 문제 출제', NOW() - INTERVAL 9 HOUR, NOW() - INTERVAL 9 HOUR),
(@company_test, @user_b_id, '테스트전자 면접 후기 17', '라이브코딩 없이 구두 설명', NOW() - INTERVAL 8 HOUR, NOW() - INTERVAL 8 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 18', '기술 깊이 확인이 강함', NOW() - INTERVAL 7 HOUR, NOW() - INTERVAL 7 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 19', 'API 설계 관점 질문', NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 6 HOUR),
(@company_test, @user_b_id, '테스트전자 면접 후기 20', '협업툴 사용 경험 질문', NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 5 HOUR),
(@company_test, @user_c_id, '테스트전자 면접 후기 21', '전형 안내 메일 상세', NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 4 HOUR),
(@company_test, @user_a_id, '테스트전자 면접 후기 22', '최종면접은 조직 적합성 중심', NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 3 HOUR),
(@company_sample, @user_a_id, '샘플소프트 코딩테스트 후기', 'SQL JOIN, 윈도우 함수 문제 포함', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY),
(@company_sample, @user_b_id, '샘플소프트 1차 면접 후기', '트래픽 대응 경험 질문 다수', NOW() - INTERVAL 40 HOUR, NOW() - INTERVAL 40 HOUR),
(@company_sample, @user_c_id, '샘플소프트 최종 면접 후기', '문화 적합성 중심', NOW() - INTERVAL 30 HOUR, NOW() - INTERVAL 30 HOUR),
(@company_mobility, @admin_id, '더미모빌리티 전형 일정 공유', '서류->코테->1차->2차->처우협의', NOW() - INTERVAL 26 HOUR, NOW() - INTERVAL 26 HOUR);

-- ------------------------------------------------------------
-- 4) one target post for all comment cases
-- ------------------------------------------------------------
SET @target_post = (
  SELECT post_id
  FROM board_post
  WHERE company_id = @company_test AND title = '테스트전자 면접 후기 22'
  ORDER BY post_id DESC
  LIMIT 1
);

-- level-1 comments
INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at) VALUES
(@target_post, NULL, @user_b_id, '저도 같은 전형 봤는데 일정이 비슷했습니다. 정보 감사합니다.', 0, NOW() - INTERVAL 120 MINUTE, NOW() - INTERVAL 120 MINUTE),
(@target_post, NULL, @user_a_id, CONCAT('긴 댓글 테스트: ', REPEAT('A', 520)), 0, NOW() - INTERVAL 110 MINUTE, NOW() - INTERVAL 110 MINUTE),
(@target_post, NULL, @admin_id, '운영자 안내: 개인정보는 가리고 공유해 주세요.', 0, NOW() - INTERVAL 95 MINUTE, NOW() - INTERVAL 95 MINUTE),
(@target_post, NULL, @user_c_id, '결과 발표까지 소요 기간도 알려주시면 감사하겠습니다.', 0, NOW() - INTERVAL 80 MINUTE, NOW() - INTERVAL 80 MINUTE);

SET @c1 = (
  SELECT comment_id FROM board_comment
  WHERE post_id = @target_post AND parent_comment_id IS NULL
  ORDER BY comment_id ASC LIMIT 1
);
SET @c2 = (
  SELECT comment_id FROM board_comment
  WHERE post_id = @target_post AND parent_comment_id IS NULL
  ORDER BY comment_id ASC LIMIT 2,1
);

-- level-2 replies (reply to level-1)
INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at) VALUES
(@target_post, @c1, @user_a_id, '공감합니다. 기술 질문 비중이 꽤 높았어요.', 0, NOW() - INTERVAL 70 MINUTE, NOW() - INTERVAL 70 MINUTE),
(@target_post, @c1, @user_c_id, '코딩테스트 언어 선택 자유였나요?', 0, NOW() - INTERVAL 65 MINUTE, NOW() - INTERVAL 65 MINUTE),
(@target_post, @c2, @user_b_id, '긴 댓글 더보기 UI 확인용 답글입니다.', 0, NOW() - INTERVAL 60 MINUTE, NOW() - INTERVAL 60 MINUTE);

SET @r1 = (
  SELECT comment_id FROM board_comment
  WHERE post_id = @target_post AND parent_comment_id = @c1
  ORDER BY comment_id ASC LIMIT 1
);
SET @r2 = (
  SELECT comment_id FROM board_comment
  WHERE post_id = @target_post AND parent_comment_id = @c1
  ORDER BY comment_id ASC LIMIT 1,1
);

-- level-3 replies (reply to level-2)  <-- allowed max depth
INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at) VALUES
(@target_post, @r1, @user_b_id, '맞아요. 특히 DB 트랜잭션 질문이 깊었습니다.', 0, NOW() - INTERVAL 55 MINUTE, NOW() - INTERVAL 55 MINUTE),
(@target_post, @r2, @user_a_id, '네, 언어는 자유였고 제출 형식 제한은 있었습니다.', 0, NOW() - INTERVAL 50 MINUTE, NOW() - INTERVAL 50 MINUTE);

SET @g1 = (
  SELECT comment_id FROM board_comment
  WHERE post_id = @target_post AND parent_comment_id = @r1
  ORDER BY comment_id DESC LIMIT 1
);

-- NOTE:
-- level-4 reply (reply to @g1) is NOT inserted intentionally.
-- current backend rule: maximum depth is 3 levels.

-- likes (mix: level-1, level-2, level-3)
INSERT IGNORE INTO board_comment_like (comment_id, user_id, created_at, updated_at) VALUES
(@c1, @user_a_id, NOW() - INTERVAL 40 MINUTE, NOW() - INTERVAL 40 MINUTE),
(@c1, @user_c_id, NOW() - INTERVAL 39 MINUTE, NOW() - INTERVAL 39 MINUTE),
(@c2, @user_b_id, NOW() - INTERVAL 38 MINUTE, NOW() - INTERVAL 38 MINUTE),
(@r1, @user_b_id, NOW() - INTERVAL 37 MINUTE, NOW() - INTERVAL 37 MINUTE),
(@r2, @user_a_id, NOW() - INTERVAL 36 MINUTE, NOW() - INTERVAL 36 MINUTE),
(@g1, @admin_id, NOW() - INTERVAL 35 MINUTE, NOW() - INTERVAL 35 MINUTE);

-- sync like_count
UPDATE board_comment c
SET c.like_count = (
  SELECT COUNT(*) FROM board_comment_like l WHERE l.comment_id = c.comment_id
)
WHERE c.post_id = @target_post;

-- ------------------------------------------------------------
-- 5) second company comment sample
-- ------------------------------------------------------------
SET @sample_post = (
  SELECT post_id
  FROM board_post
  WHERE company_id = @company_sample AND title = '샘플소프트 코딩테스트 후기'
  ORDER BY post_id DESC
  LIMIT 1
);

INSERT INTO board_comment (post_id, parent_comment_id, user_id, content, like_count, created_at, updated_at) VALUES
(@sample_post, NULL, @user_c_id, '문제 유형 공유 감사합니다. 다음 회차 준비에 큰 도움됐습니다.', 0, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(@sample_post, NULL, @admin_id, '운영자 확인: 비방/허위 정보는 제재 대상입니다.', 0, NOW() - INTERVAL 22 HOUR, NOW() - INTERVAL 22 HOUR);

-- ------------------------------------------------------------
-- 6) sanity checks (optional)
-- ------------------------------------------------------------
-- SELECT COUNT(*) AS posts_test_company FROM board_post WHERE company_id = @company_test;
-- SELECT COUNT(*) AS top_comments FROM board_comment WHERE post_id = @target_post AND parent_comment_id IS NULL;
-- SELECT COUNT(*) AS depth2_comments FROM board_comment WHERE parent_comment_id IN (SELECT comment_id FROM board_comment WHERE post_id = @target_post AND parent_comment_id IS NULL);
-- SELECT COUNT(*) AS depth3_comments FROM board_comment WHERE parent_comment_id IN (SELECT comment_id FROM board_comment WHERE parent_comment_id IN (SELECT comment_id FROM board_comment WHERE post_id = @target_post AND parent_comment_id IS NULL));
-- SELECT comment_id, parent_comment_id, like_count FROM board_comment WHERE post_id = @target_post ORDER BY comment_id;
