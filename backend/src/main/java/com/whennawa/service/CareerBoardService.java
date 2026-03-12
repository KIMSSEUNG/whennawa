package com.whennawa.service;

import com.whennawa.config.CareerBoardConstants;
import com.whennawa.dto.board.BoardCommentCreateRequest;
import com.whennawa.dto.board.BoardCommentResponse;
import com.whennawa.dto.board.BoardCommentUpdateRequest;
import com.whennawa.dto.board.BoardPageResponse;
import com.whennawa.dto.board.BoardPostCreateRequest;
import com.whennawa.dto.board.BoardPostResponse;
import com.whennawa.dto.board.BoardPostUpdateRequest;
import com.whennawa.entity.CareerBoardComment;
import com.whennawa.entity.CareerBoardCommentLike;
import com.whennawa.entity.CareerBoardPost;
import com.whennawa.entity.User;
import com.whennawa.repository.CareerBoardCommentLikeRepository;
import com.whennawa.repository.CareerBoardCommentRepository;
import com.whennawa.repository.CareerBoardPostRepository;
import com.whennawa.repository.UserRepository;
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
public class CareerBoardService {
    private static final int DEFAULT_POST_PAGE_SIZE = 20;
    private static final int MAX_POST_PAGE_SIZE = 50;
    private static final int DEFAULT_COMMENT_PAGE_SIZE = 20;
    private static final int MAX_COMMENT_PAGE_SIZE = 50;

    private final CareerBoardPostRepository careerBoardPostRepository;
    private final CareerBoardCommentRepository careerBoardCommentRepository;
    private final CareerBoardCommentLikeRepository careerBoardCommentLikeRepository;
    private final UserRepository userRepository;
    private final ProfanityMasker profanityMasker;
    private final UserBlockService userBlockService;

    @Transactional(readOnly = true)
    public BoardPageResponse<BoardPostResponse> listPosts(Integer page, Integer size, Long currentUserId) {
        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_POST_PAGE_SIZE, MAX_POST_PAGE_SIZE);
        Set<Long> blockedUserIds = userBlockService.findBlockedUserIds(currentUserId);

        Page<CareerBoardPost> result = careerBoardPostRepository.findAllByOrderByCreatedAtDesc(
            PageRequest.of(boundedPage, boundedSize)
        );

        List<BoardPostResponse> items = result.getContent().stream()
            .filter(post -> !isBlockedAuthor(post == null ? null : post.getUser(), blockedUserIds))
            .map(this::toPostResponse)
            .toList();

        return new BoardPageResponse<>(
            items,
            boundedPage,
            boundedSize,
            result.hasNext(),
            result.getTotalPages(),
            result.getTotalElements()
        );
    }

    @Transactional(readOnly = true)
    public BoardPostResponse getPost(Long postId, Long currentUserId) {
        CareerBoardPost post = careerBoardPostRepository.findByPostId(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        Set<Long> blockedUserIds = userBlockService.findBlockedUserIds(currentUserId);
        if (isBlockedAuthor(post.getUser(), blockedUserIds)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
        }
        return toPostResponse(post);
    }

    @Transactional
    public BoardPostResponse createPost(BoardPostCreateRequest request, Long userId) {
        User user = resolveUser(userId);
        String title = normalizeText(request == null ? null : request.getTitle(), "Title is required", 120);
        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);

        CareerBoardPost post = new CareerBoardPost();
        post.setUser(user);
        post.setTitle(profanityMasker.mask(title));
        post.setContent(profanityMasker.mask(content));
        post.setAnonymous(Boolean.TRUE.equals(request == null ? null : request.getAnonymous()));
        return toPostResponse(careerBoardPostRepository.save(post));
    }

    @Transactional(readOnly = true)
    public BoardPageResponse<BoardPostResponse> searchPosts(String query,
                                                            String field,
                                                            Integer page,
                                                            Integer size,
                                                            Long currentUserId) {
        Set<Long> blockedUserIds = userBlockService.findBlockedUserIds(currentUserId);

        String normalizedQuery = normalizeText(query, "Query is required", 100);
        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_POST_PAGE_SIZE, MAX_POST_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(boundedPage, boundedSize);
        String target = field == null ? "title" : field.trim().toLowerCase();

        Page<CareerBoardPost> result = switch (target) {
            case "content" -> careerBoardPostRepository.searchByContent(normalizedQuery, pageable);
            default -> careerBoardPostRepository.searchByTitle(normalizedQuery, pageable);
        };

        List<BoardPostResponse> items = result.getContent().stream()
            .filter(post -> !isBlockedAuthor(post == null ? null : post.getUser(), blockedUserIds))
            .map(this::toPostResponse)
            .toList();

        return new BoardPageResponse<>(
            items,
            boundedPage,
            boundedSize,
            result.hasNext(),
            result.getTotalPages(),
            result.getTotalElements()
        );
    }

    @Transactional
    public BoardPostResponse updatePost(Long postId,
                                        BoardPostUpdateRequest request,
                                        Long userId,
                                        boolean isAdmin) {
        CareerBoardPost post = careerBoardPostRepository.findByPostId(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        ensureCanModeratePost(post, userId, isAdmin);

        post.setTitle(profanityMasker.mask(normalizeText(request == null ? null : request.getTitle(), "Title is required", 120)));
        post.setContent(profanityMasker.mask(normalizeText(request == null ? null : request.getContent(), "Content is required", 3000)));
        return toPostResponse(post);
    }

    @Transactional
    public void deletePost(Long postId, Long userId, boolean isAdmin) {
        CareerBoardPost post = careerBoardPostRepository.findByPostId(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        ensureCanModeratePost(post, userId, isAdmin);

        List<CareerBoardComment> allComments = careerBoardCommentRepository.findByPostPostId(postId);
        for (CareerBoardComment comment : allComments) {
            careerBoardCommentLikeRepository.deleteByCommentCommentId(comment.getCommentId());
        }
        careerBoardCommentRepository.deleteAll(allComments);
        careerBoardPostRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public BoardPageResponse<BoardCommentResponse> listComments(Long postId,
                                                                Integer page,
                                                                Integer size,
                                                                Long currentUserId) {
        CareerBoardPost post = resolvePost(postId);

        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_COMMENT_PAGE_SIZE, MAX_COMMENT_PAGE_SIZE);
        Page<CareerBoardComment> topPage = careerBoardCommentRepository.findByPostPostIdAndParentCommentIsNullOrderByCreatedAtDesc(
            post.getPostId(),
            PageRequest.of(boundedPage, boundedSize)
        );

        List<CareerBoardComment> parents = topPage.getContent();
        if (parents.isEmpty()) {
            return new BoardPageResponse<>(
                Collections.emptyList(),
                boundedPage,
                boundedSize,
                topPage.hasNext(),
                topPage.getTotalPages(),
                topPage.getTotalElements()
            );
        }

        List<Long> parentIds = parents.stream().map(CareerBoardComment::getCommentId).toList();
        List<CareerBoardComment> repliesLv1 = careerBoardCommentRepository.findByParentCommentCommentIdInOrderByCreatedAtAsc(parentIds);
        List<Long> replyLv1Ids = repliesLv1.stream().map(CareerBoardComment::getCommentId).toList();
        List<CareerBoardComment> repliesLv2 = replyLv1Ids.isEmpty()
            ? Collections.emptyList()
            : careerBoardCommentRepository.findByParentCommentCommentIdInOrderByCreatedAtAsc(replyLv1Ids);

        Map<Long, List<CareerBoardComment>> repliesByParent = new HashMap<>();
        for (CareerBoardComment reply : repliesLv1) {
            Long parentId = reply.getParentComment() == null ? null : reply.getParentComment().getCommentId();
            if (parentId == null) continue;
            repliesByParent.computeIfAbsent(parentId, key -> new ArrayList<>()).add(reply);
        }
        for (CareerBoardComment reply : repliesLv2) {
            Long parentId = reply.getParentComment() == null ? null : reply.getParentComment().getCommentId();
            if (parentId == null) continue;
            repliesByParent.computeIfAbsent(parentId, key -> new ArrayList<>()).add(reply);
        }

        Set<Long> likedIds = resolveLikedCommentIds(
            currentUserId,
            mergeCommentIds(parents, repliesLv1, repliesLv2)
        );
        Set<Long> blockedUserIds = userBlockService.findBlockedUserIds(currentUserId);

        List<BoardCommentResponse> items = parents.stream()
            .filter(parent -> !isBlockedAuthor(parent == null ? null : parent.getUser(), blockedUserIds))
            .map(parent -> {
                List<CareerBoardComment> childComments = repliesByParent.getOrDefault(parent.getCommentId(), Collections.emptyList());
                List<BoardCommentResponse> childResponses = childComments.stream()
                    .filter(reply -> !isBlockedAuthor(reply == null ? null : reply.getUser(), blockedUserIds))
                    .map(reply -> {
                        List<CareerBoardComment> grandChildren = repliesByParent.getOrDefault(
                            reply.getCommentId(),
                            Collections.emptyList()
                        );
                        List<BoardCommentResponse> grandChildResponses = grandChildren.stream()
                            .filter(grandChild -> !isBlockedAuthor(grandChild == null ? null : grandChild.getUser(), blockedUserIds))
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

        return new BoardPageResponse<>(
            items,
            boundedPage,
            boundedSize,
            topPage.hasNext(),
            topPage.getTotalPages(),
            topPage.getTotalElements()
        );
    }

    @Transactional
    public BoardCommentResponse createComment(Long postId,
                                              BoardCommentCreateRequest request,
                                              Long userId) {
        User user = resolveUser(userId);
        CareerBoardPost post = resolvePost(postId);

        CareerBoardComment parent = null;
        if (request != null && request.getParentCommentId() != null) {
            parent = careerBoardCommentRepository.findByCommentIdAndPostPostId(request.getParentCommentId(), post.getPostId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent comment not found"));
            int parentDepth = resolveCommentDepth(parent);
            if (parentDepth >= 2) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum reply depth is 3 levels");
            }
        }

        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);

        CareerBoardComment comment = new CareerBoardComment();
        comment.setPost(post);
        comment.setParentComment(parent);
        comment.setUser(user);
        comment.setContent(profanityMasker.mask(content));
        comment.setAnonymous(Boolean.TRUE.equals(request == null ? null : request.getAnonymous()));
        comment.setLikeCount(0);

        CareerBoardComment saved = careerBoardCommentRepository.save(comment);
        return toCommentResponse(saved, false, Collections.emptyList());
    }

    @Transactional
    public BoardCommentResponse updateComment(Long postId,
                                              Long commentId,
                                              BoardCommentUpdateRequest request,
                                              Long userId,
                                              boolean isAdmin) {
        CareerBoardComment comment = resolveComment(postId, commentId);
        ensureCanModerateComment(comment, userId, isAdmin);

        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);
        comment.setContent(profanityMasker.mask(content));
        return toCommentResponse(comment, false, Collections.emptyList());
    }

    @Transactional
    public void deleteComment(Long postId,
                              Long commentId,
                              Long userId,
                              boolean isAdmin) {
        CareerBoardComment comment = resolveComment(postId, commentId);
        ensureCanModerateComment(comment, userId, isAdmin);

        List<CareerBoardComment> descendants = collectDescendants(comment.getCommentId());
        for (CareerBoardComment descendant : descendants) {
            careerBoardCommentLikeRepository.deleteByCommentCommentId(descendant.getCommentId());
        }
        Collections.reverse(descendants);
        careerBoardCommentRepository.deleteAll(descendants);

        careerBoardCommentLikeRepository.deleteByCommentCommentId(comment.getCommentId());
        careerBoardCommentRepository.delete(comment);
    }

    @Transactional
    public BoardCommentResponse likeComment(Long postId,
                                            Long commentId,
                                            Long userId) {
        User user = resolveUser(userId);
        CareerBoardComment comment = resolveComment(postId, commentId);

        if (!careerBoardCommentLikeRepository.existsByCommentCommentIdAndUser_Id(comment.getCommentId(), user.getId())) {
            CareerBoardCommentLike like = new CareerBoardCommentLike();
            like.setComment(comment);
            like.setUser(user);
            try {
                careerBoardCommentLikeRepository.save(like);
                comment.setLikeCount(Math.max(0, comment.getLikeCount() == null ? 0 : comment.getLikeCount()) + 1);
            } catch (DataIntegrityViolationException ignored) {
                // idempotent when request races
            }
        }

        return toCommentResponse(comment, true, Collections.emptyList());
    }

    @Transactional
    public BoardCommentResponse unlikeComment(Long postId,
                                              Long commentId,
                                              Long userId) {
        resolveUser(userId);
        CareerBoardComment comment = resolveComment(postId, commentId);

        long removed = careerBoardCommentLikeRepository.deleteByCommentCommentIdAndUser_Id(comment.getCommentId(), userId);
        if (removed > 0) {
            int current = Math.max(0, comment.getLikeCount() == null ? 0 : comment.getLikeCount());
            comment.setLikeCount(Math.max(0, current - 1));
        }

        return toCommentResponse(comment, false, Collections.emptyList());
    }

    private CareerBoardPost resolvePost(Long postId) {
        return careerBoardPostRepository.findByPostId(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
    }

    private CareerBoardComment resolveComment(Long postId, Long commentId) {
        resolvePost(postId);
        return careerBoardCommentRepository.findByCommentIdAndPostPostId(commentId, postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private int clampPageSize(Integer requested, int defaultSize, int maxSize) {
        int value = requested == null ? defaultSize : requested;
        if (value <= 0) return defaultSize;
        return Math.min(value, maxSize);
    }

    private String normalizeText(String raw, String message, int maxLength) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        String trimmed = raw.trim();
        if (trimmed.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return trimmed;
    }

    private boolean isBlockedAuthor(User author, Set<Long> blockedUserIds) {
        if (author == null || blockedUserIds == null || blockedUserIds.isEmpty()) return false;
        return blockedUserIds.contains(author.getId());
    }

    private void ensureCanModeratePost(CareerBoardPost post, Long userId, boolean isAdmin) {
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
        }
        if (isAdmin) return;
        Long ownerId = post.getUser() == null ? null : post.getUser().getId();
        if (ownerId == null || userId == null || !ownerId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void ensureCanModerateComment(CareerBoardComment comment, Long userId, boolean isAdmin) {
        if (comment == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        if (isAdmin) return;
        Long ownerId = comment.getUser() == null ? null : comment.getUser().getId();
        if (ownerId == null || userId == null || !ownerId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private BoardPostResponse toPostResponse(CareerBoardPost post) {
        Long authorId = post.getUser() == null ? null : post.getUser().getId();
        String authorName = post.isAnonymous()
            ? "익명"
            : (post.getUser() == null ? "알 수 없음" : displayName(post.getUser()));

        return new BoardPostResponse(
            post.getPostId(),
            null,
            CareerBoardConstants.CAREER_BOARD_NAME,
            post.getTitle(),
            post.getContent(),
            authorId,
            authorName,
            post.getCreatedAt()
        );
    }

    private BoardCommentResponse toCommentResponse(CareerBoardComment comment, boolean likedByMe, List<BoardCommentResponse> replies) {
        Long authorId = comment.getUser() == null ? null : comment.getUser().getId();
        String authorName = comment.isAnonymous()
            ? "익명"
            : (comment.getUser() == null ? "알 수 없음" : displayName(comment.getUser()));

        int likeCount = Math.max(0, comment.getLikeCount() == null ? 0 : comment.getLikeCount());
        Long parentId = comment.getParentComment() == null ? null : comment.getParentComment().getCommentId();

        return new BoardCommentResponse(
            comment.getCommentId(),
            comment.getPost() == null ? null : comment.getPost().getPostId(),
            parentId,
            comment.getContent(),
            authorId,
            authorName,
            comment.getCreatedAt(),
            comment.getUpdatedAt(),
            likeCount,
            likedByMe,
            replies == null ? 0 : replies.size(),
            replies == null ? List.of() : replies
        );
    }

    private String displayName(User user) {
        if (user == null) return "알 수 없음";
        if (user.getNickname() != null && !user.getNickname().isBlank()) return user.getNickname().trim();
        if (user.getEmail() != null && !user.getEmail().isBlank()) return user.getEmail().trim();
        return "알 수 없음";
    }

    private Set<Long> resolveLikedCommentIds(Long userId, Collection<Long> commentIds) {
        if (userId == null || commentIds == null || commentIds.isEmpty()) return Set.of();
        return careerBoardCommentLikeRepository.findByUser_IdAndCommentCommentIdIn(userId, commentIds).stream()
            .map(like -> like.getComment() == null ? null : like.getComment().getCommentId())
            .filter(id -> id != null)
            .collect(Collectors.toSet());
    }

    private List<Long> mergeCommentIds(List<CareerBoardComment> parents,
                                       List<CareerBoardComment> repliesLv1,
                                       List<CareerBoardComment> repliesLv2) {
        List<Long> ids = new ArrayList<>();
        if (parents != null) {
            for (CareerBoardComment c : parents) if (c != null && c.getCommentId() != null) ids.add(c.getCommentId());
        }
        if (repliesLv1 != null) {
            for (CareerBoardComment c : repliesLv1) if (c != null && c.getCommentId() != null) ids.add(c.getCommentId());
        }
        if (repliesLv2 != null) {
            for (CareerBoardComment c : repliesLv2) if (c != null && c.getCommentId() != null) ids.add(c.getCommentId());
        }
        return ids;
    }

    private int resolveCommentDepth(CareerBoardComment comment) {
        int depth = 0;
        CareerBoardComment cursor = comment;
        while (cursor != null && cursor.getParentComment() != null) {
            depth++;
            cursor = cursor.getParentComment();
            if (depth > 10) break;
        }
        return depth;
    }

    private List<CareerBoardComment> collectDescendants(Long rootCommentId) {
        List<CareerBoardComment> collected = new ArrayList<>();
        if (rootCommentId == null) return collected;

        List<CareerBoardComment> queue = new ArrayList<>(careerBoardCommentRepository.findByParentCommentCommentId(rootCommentId));
        while (!queue.isEmpty()) {
            CareerBoardComment current = queue.remove(0);
            collected.add(current);
            queue.addAll(careerBoardCommentRepository.findByParentCommentCommentId(current.getCommentId()));
        }
        return collected;
    }
}
