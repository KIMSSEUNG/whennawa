package com.whennawa.service;

import com.whennawa.dto.board.BoardCommentCreateRequest;
import com.whennawa.dto.board.BoardCommentResponse;
import com.whennawa.dto.board.BoardCommentUpdateRequest;
import com.whennawa.dto.board.BoardPageResponse;
import com.whennawa.dto.board.BoardPostCreateRequest;
import com.whennawa.dto.board.BoardPostResponse;
import com.whennawa.dto.board.BoardPostUpdateRequest;
import com.whennawa.entity.BoardComment;
import com.whennawa.entity.BoardCommentLike;
import com.whennawa.entity.BoardPost;
import com.whennawa.entity.Company;
import com.whennawa.entity.User;
import com.whennawa.repository.BoardCommentLikeRepository;
import com.whennawa.repository.BoardCommentRepository;
import com.whennawa.repository.BoardPostRepository;
import com.whennawa.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BoardService {
    private static final int DEFAULT_POST_PAGE_SIZE = 20;
    private static final int MAX_POST_PAGE_SIZE = 50;
    private static final int DEFAULT_COMMENT_PAGE_SIZE = 20;
    private static final int MAX_COMMENT_PAGE_SIZE = 50;

    private final CompanySearchService companySearchService;
    private final BoardPostRepository boardPostRepository;
    private final BoardCommentRepository boardCommentRepository;
    private final BoardCommentLikeRepository boardCommentLikeRepository;
    private final UserRepository userRepository;
    private final ProfanityMasker profanityMasker;

    @Transactional(readOnly = true)
    public BoardPageResponse<BoardPostResponse> listPosts(String companyName, Integer page, Integer size) {
        Company company = resolveCompany(companyName);
        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_POST_PAGE_SIZE, MAX_POST_PAGE_SIZE);

        Page<BoardPost> result = boardPostRepository.findByCompanyCompanyIdOrderByCreatedAtDesc(
            company.getCompanyId(),
            PageRequest.of(boundedPage, boundedSize)
        );

        return new BoardPageResponse<>(
            result.getContent().stream().map(this::toPostResponse).toList(),
            boundedPage,
            boundedSize,
            result.hasNext()
        );
    }

    @Transactional(readOnly = true)
    public BoardPostResponse getPost(String companyName, Long postId) {
        Company company = resolveCompany(companyName);
        BoardPost post = boardPostRepository.findByPostIdAndCompanyCompanyId(postId, company.getCompanyId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        return toPostResponse(post);
    }

    @Transactional
    public BoardPostResponse createPost(String companyName, BoardPostCreateRequest request, Long userId) {
        User user = resolveUser(userId);
        Company company = resolveCompany(companyName);
        String title = normalizeText(request == null ? null : request.getTitle(), "Title is required", 120);
        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);

        BoardPost post = new BoardPost();
        post.setCompany(company);
        post.setUser(user);
        post.setTitle(profanityMasker.mask(title));
        post.setContent(profanityMasker.mask(content));
        post.setAnonymous(Boolean.TRUE.equals(request == null ? null : request.getAnonymous()));
        return toPostResponse(boardPostRepository.save(post));
    }

    @Transactional(readOnly = true)
    public BoardPageResponse<BoardPostResponse> searchPosts(String companyName,
                                                            String query,
                                                            String field,
                                                            Integer page,
                                                            Integer size) {
        Company company = resolveCompany(companyName);

        String normalizedQuery = normalizeText(query, "Query is required", 100);
        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_POST_PAGE_SIZE, MAX_POST_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(boundedPage, boundedSize);
        String target = field == null ? "title" : field.trim().toLowerCase();

        Page<BoardPost> result = switch (target) {
            case "content" -> boardPostRepository.searchByContent(company.getCompanyId(), normalizedQuery, pageable);
            default -> boardPostRepository.searchByTitle(company.getCompanyId(), normalizedQuery, pageable);
        };

        return new BoardPageResponse<>(
            result.getContent().stream().map(this::toPostResponse).toList(),
            boundedPage,
            boundedSize,
            result.hasNext()
        );
    }

    @Transactional
    public BoardPostResponse updatePost(String companyName,
                                        Long postId,
                                        BoardPostUpdateRequest request,
                                        Long userId,
                                        boolean isAdmin) {
        Company company = resolveCompany(companyName);
        BoardPost post = boardPostRepository.findByPostIdAndCompanyCompanyId(postId, company.getCompanyId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        ensureCanModeratePost(post, userId, isAdmin);

        post.setTitle(profanityMasker.mask(normalizeText(request == null ? null : request.getTitle(), "Title is required", 120)));
        post.setContent(profanityMasker.mask(normalizeText(request == null ? null : request.getContent(), "Content is required", 3000)));
        return toPostResponse(post);
    }

    @Transactional
    public void deletePost(String companyName, Long postId, Long userId, boolean isAdmin) {
        Company company = resolveCompany(companyName);
        BoardPost post = boardPostRepository.findByPostIdAndCompanyCompanyId(postId, company.getCompanyId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        ensureCanModeratePost(post, userId, isAdmin);

        List<BoardComment> allComments = boardCommentRepository.findByPostPostId(postId);
        for (BoardComment comment : allComments) {
            boardCommentLikeRepository.deleteByCommentCommentId(comment.getCommentId());
        }
        boardCommentRepository.deleteAll(allComments);
        boardPostRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public BoardPageResponse<BoardCommentResponse> listComments(String companyName,
                                                                Long postId,
                                                                Integer page,
                                                                Integer size,
                                                                Long currentUserId) {
        BoardPost post = resolvePost(companyName, postId);

        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_COMMENT_PAGE_SIZE, MAX_COMMENT_PAGE_SIZE);
        Page<BoardComment> topPage = boardCommentRepository.findByPostPostIdAndParentCommentIsNullOrderByCreatedAtDesc(
            post.getPostId(),
            PageRequest.of(boundedPage, boundedSize)
        );

        List<BoardComment> parents = topPage.getContent();
        if (parents.isEmpty()) {
            return new BoardPageResponse<>(Collections.emptyList(), boundedPage, boundedSize, topPage.hasNext());
        }

        List<Long> parentIds = parents.stream().map(BoardComment::getCommentId).toList();
        List<BoardComment> repliesLv1 = boardCommentRepository.findByParentCommentCommentIdInOrderByCreatedAtAsc(parentIds);
        List<Long> replyLv1Ids = repliesLv1.stream().map(BoardComment::getCommentId).toList();
        List<BoardComment> repliesLv2 = replyLv1Ids.isEmpty()
            ? Collections.emptyList()
            : boardCommentRepository.findByParentCommentCommentIdInOrderByCreatedAtAsc(replyLv1Ids);

        Map<Long, List<BoardComment>> repliesByParent = new HashMap<>();
        for (BoardComment reply : repliesLv1) {
            Long parentId = reply.getParentComment() == null ? null : reply.getParentComment().getCommentId();
            if (parentId == null) continue;
            repliesByParent.computeIfAbsent(parentId, key -> new ArrayList<>()).add(reply);
        }
        for (BoardComment reply : repliesLv2) {
            Long parentId = reply.getParentComment() == null ? null : reply.getParentComment().getCommentId();
            if (parentId == null) continue;
            repliesByParent.computeIfAbsent(parentId, key -> new ArrayList<>()).add(reply);
        }

        Set<Long> likedIds = resolveLikedCommentIds(
            currentUserId,
            mergeCommentIds(parents, repliesLv1, repliesLv2)
        );

        List<BoardCommentResponse> items = parents.stream()
            .map(parent -> {
                List<BoardComment> childComments = repliesByParent.getOrDefault(parent.getCommentId(), Collections.emptyList());
                List<BoardCommentResponse> childResponses = childComments.stream()
                    .map(reply -> {
                        List<BoardComment> grandChildren = repliesByParent.getOrDefault(
                            reply.getCommentId(),
                            Collections.emptyList()
                        );
                        List<BoardCommentResponse> grandChildResponses = grandChildren.stream()
                            .map(grandChild -> toCommentResponse(
                                grandChild,
                                likedIds.contains(grandChild.getCommentId()),
                                Collections.emptyList()
                            ))
                            .toList();
                        return toCommentResponse(reply, likedIds.contains(reply.getCommentId()), grandChildResponses);
                    })
                    .toList();
                return toCommentResponse(parent, likedIds.contains(parent.getCommentId()), childResponses);
            })
            .toList();

        return new BoardPageResponse<>(items, boundedPage, boundedSize, topPage.hasNext());
    }

    @Transactional
    public BoardCommentResponse createComment(String companyName,
                                              Long postId,
                                              BoardCommentCreateRequest request,
                                              Long userId) {
        User user = resolveUser(userId);
        BoardPost post = resolvePost(companyName, postId);

        BoardComment parent = null;
        if (request != null && request.getParentCommentId() != null) {
            parent = boardCommentRepository.findByCommentIdAndPostPostId(request.getParentCommentId(), post.getPostId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent comment not found"));
            int parentDepth = resolveCommentDepth(parent);
            if (parentDepth >= 2) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum reply depth is 3 levels");
            }
        }

        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);

        BoardComment comment = new BoardComment();
        comment.setPost(post);
        comment.setParentComment(parent);
        comment.setUser(user);
        comment.setContent(profanityMasker.mask(content));
        comment.setAnonymous(Boolean.TRUE.equals(request == null ? null : request.getAnonymous()));
        comment.setLikeCount(0);

        BoardComment saved = boardCommentRepository.save(comment);
        return toCommentResponse(saved, false, Collections.emptyList());
    }

    @Transactional
    public BoardCommentResponse updateComment(String companyName,
                                              Long postId,
                                              Long commentId,
                                              BoardCommentUpdateRequest request,
                                              Long userId,
                                              boolean isAdmin) {
        BoardComment comment = resolveComment(companyName, postId, commentId);
        ensureCanModerateComment(comment, userId, isAdmin);

        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);
        comment.setContent(profanityMasker.mask(content));
        return toCommentResponse(comment, false, Collections.emptyList());
    }

    @Transactional
    public void deleteComment(String companyName,
                              Long postId,
                              Long commentId,
                              Long userId,
                              boolean isAdmin) {
        BoardComment comment = resolveComment(companyName, postId, commentId);
        ensureCanModerateComment(comment, userId, isAdmin);

        List<BoardComment> descendants = collectDescendants(comment.getCommentId());
        for (BoardComment descendant : descendants) {
            boardCommentLikeRepository.deleteByCommentCommentId(descendant.getCommentId());
        }
        Collections.reverse(descendants);
        boardCommentRepository.deleteAll(descendants);

        boardCommentLikeRepository.deleteByCommentCommentId(comment.getCommentId());
        boardCommentRepository.delete(comment);
    }

    @Transactional
    public BoardCommentResponse likeComment(String companyName,
                                            Long postId,
                                            Long commentId,
                                            Long userId) {
        User user = resolveUser(userId);
        BoardComment comment = resolveComment(companyName, postId, commentId);

        if (!boardCommentLikeRepository.existsByCommentCommentIdAndUser_Id(comment.getCommentId(), user.getId())) {
            BoardCommentLike like = new BoardCommentLike();
            like.setComment(comment);
            like.setUser(user);
            try {
                boardCommentLikeRepository.save(like);
                comment.setLikeCount(comment.getLikeCount() + 1);
            } catch (DataIntegrityViolationException ignored) {
                // idempotent fallback for concurrent click
            }
        }

        return toCommentResponse(comment, true, Collections.emptyList());
    }

    @Transactional
    public BoardCommentResponse unlikeComment(String companyName,
                                              Long postId,
                                              Long commentId,
                                              Long userId) {
        resolveUser(userId);
        BoardComment comment = resolveComment(companyName, postId, commentId);

        long deleted = boardCommentLikeRepository.deleteByCommentCommentIdAndUser_Id(comment.getCommentId(), userId);
        if (deleted > 0 && comment.getLikeCount() > 0) {
            comment.setLikeCount(comment.getLikeCount() - 1);
        }

        return toCommentResponse(comment, false, Collections.emptyList());
    }

    @Transactional
    public long purgeOldPosts(long retentionDays) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1L, retentionDays));
        return boardPostRepository.deleteByCreatedAtBefore(cutoff);
    }

    private Company resolveCompany(String companyName) {
        Company company = companySearchService.resolveActiveCompany(companyName);
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        return company;
    }

    private BoardPost resolvePost(String companyName, Long postId) {
        Company company = resolveCompany(companyName);
        return boardPostRepository.findByPostIdAndCompanyCompanyId(postId, company.getCompanyId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
    }

    private BoardComment resolveComment(String companyName, Long postId, Long commentId) {
        BoardPost post = resolvePost(companyName, postId);
        return boardCommentRepository.findByCommentIdAndPostPostId(commentId, post.getPostId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));
    }

    private int clampPageSize(Integer rawSize, int defaultSize, int maxSize) {
        if (rawSize == null) return defaultSize;
        return Math.max(1, Math.min(rawSize, maxSize));
    }

    private String normalizeText(String raw, String emptyMessage, int maxLen) {
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, emptyMessage);
        }
        String trimmed = raw.trim();
        if (trimmed.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, emptyMessage);
        }
        if (trimmed.length() > maxLen) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Text too long");
        }
        return trimmed;
    }

    private void ensureCanModeratePost(BoardPost post, Long userId, boolean isAdmin) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (isAdmin) return;
        if (post.getUser() == null || !userId.equals(post.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can modify post");
        }
    }

    private void ensureCanModerateComment(BoardComment comment, Long userId, boolean isAdmin) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (isAdmin) return;
        if (comment.getUser() == null || !userId.equals(comment.getUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author or admin can modify comment");
        }
    }

    private Set<Long> resolveLikedCommentIds(Long userId, Collection<Long> commentIds) {
        if (userId == null || commentIds == null || commentIds.isEmpty()) return Collections.emptySet();
        return boardCommentLikeRepository.findByUser_IdAndCommentCommentIdIn(userId, commentIds)
            .stream()
            .map(like -> like.getComment().getCommentId())
            .collect(Collectors.toSet());
    }

    private List<Long> mergeCommentIds(List<BoardComment> parents, List<BoardComment> repliesLv1, List<BoardComment> repliesLv2) {
        List<Long> ids = new ArrayList<>(parents.size() + repliesLv1.size() + repliesLv2.size());
        for (BoardComment comment : parents) ids.add(comment.getCommentId());
        for (BoardComment comment : repliesLv1) ids.add(comment.getCommentId());
        for (BoardComment comment : repliesLv2) ids.add(comment.getCommentId());
        return ids;
    }

    private int resolveCommentDepth(BoardComment comment) {
        int depth = 0;
        BoardComment cursor = comment;
        while (cursor.getParentComment() != null) {
            depth += 1;
            cursor = cursor.getParentComment();
            if (depth > 8) {
                break;
            }
        }
        return depth;
    }

    private List<BoardComment> collectDescendants(Long rootCommentId) {
        List<BoardComment> descendants = new ArrayList<>();
        List<Long> frontier = Collections.singletonList(rootCommentId);
        while (!frontier.isEmpty()) {
            List<BoardComment> children = boardCommentRepository.findByParentCommentCommentIdInOrderByCreatedAtAsc(frontier);
            if (children.isEmpty()) break;
            descendants.addAll(children);
            frontier = children.stream().map(BoardComment::getCommentId).toList();
        }
        return descendants;
    }

    private String resolveAuthorName(User user) {
        String nickname = user == null ? null : user.getNickname();
        if (nickname != null && !nickname.isBlank()) return nickname;
        String email = user == null ? null : user.getEmail();
        if (email == null || email.isBlank()) return "user";
        return email.split("@")[0];
    }

    private String resolveAnonymousAlias(Long id) {
        if (id == null) {
            return "익명";
        }
        return "익명#" + String.format("%05d", Math.floorMod(id, 100_000));
    }

    private BoardPostResponse toPostResponse(BoardPost post) {
        return new BoardPostResponse(
            post.getPostId(),
            post.getCompany().getCompanyId(),
            post.getCompany().getCompanyName(),
            post.getTitle(),
            post.getContent(),
            post.getUser() == null ? null : post.getUser().getId(),
            post.isAnonymous() ? resolveAnonymousAlias(post.getPostId()) : resolveAuthorName(post.getUser()),
            post.getCreatedAt()
        );
    }

    private BoardCommentResponse toCommentResponse(BoardComment comment,
                                                   boolean likedByMe,
                                                   List<BoardCommentResponse> replies) {
        List<BoardCommentResponse> safeReplies = replies == null ? Collections.emptyList() : replies;
        Long parentId = comment.getParentComment() == null ? null : comment.getParentComment().getCommentId();
        return new BoardCommentResponse(
            comment.getCommentId(),
            comment.getPost() == null ? null : comment.getPost().getPostId(),
            parentId,
            comment.getContent(),
            comment.getUser() == null ? null : comment.getUser().getId(),
            comment.isAnonymous() ? resolveAnonymousAlias(comment.getCommentId()) : resolveAuthorName(comment.getUser()),
            comment.getCreatedAt(),
            comment.getUpdatedAt(),
            Math.max(0, comment.getLikeCount()),
            likedByMe,
            safeReplies.size(),
            safeReplies
        );
    }
}
