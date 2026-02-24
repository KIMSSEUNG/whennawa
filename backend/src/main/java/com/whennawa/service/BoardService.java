package com.whennawa.service;

import com.whennawa.dto.board.BoardPostCreateRequest;
import com.whennawa.dto.board.BoardPostResponse;
import com.whennawa.dto.board.BoardPostUpdateRequest;
import com.whennawa.entity.BoardPost;
import com.whennawa.entity.Company;
import com.whennawa.entity.User;
import com.whennawa.repository.BoardPostRepository;
import com.whennawa.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BoardService {
    private static final long SEARCH_COOLDOWN_MS = 3000L;
    private final CompanySearchService companySearchService;
    private final BoardPostRepository boardPostRepository;
    private final UserRepository userRepository;
    private final ProfanityMasker profanityMasker;
    private final ConcurrentMap<String, Long> lastBoardSearchAtBySession = new ConcurrentHashMap<>();

    @Transactional(readOnly = true)
    public List<BoardPostResponse> listPosts(String companyName, int limit) {
        Company company = companySearchService.resolveActiveCompany(companyName);
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        int boundedLimit = Math.max(1, Math.min(limit, 100));
        return boardPostRepository.findByCompanyCompanyIdOrderByCreatedAtDesc(
                company.getCompanyId(),
                PageRequest.of(0, boundedLimit)
            ).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public BoardPostResponse createPost(String companyName, BoardPostCreateRequest request, Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Company company = companySearchService.resolveActiveCompany(companyName);
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));
        String title = normalizeText(request == null ? null : request.getTitle(), "Title is required", 120);
        String content = normalizeText(request == null ? null : request.getContent(), "Content is required", 3000);

        BoardPost post = new BoardPost();
        post.setCompany(company);
        post.setUser(user);
        post.setTitle(profanityMasker.mask(title));
        post.setContent(profanityMasker.mask(content));
        return toResponse(boardPostRepository.save(post));
    }

    @Transactional(readOnly = true)
    public List<BoardPostResponse> searchPosts(String companyName,
                                               String query,
                                               String field,
                                               int limit,
                                               String sessionKey) {
        enforceSearchCooldown(sessionKey);
        Company company = companySearchService.resolveActiveCompany(companyName);
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        String normalizedQuery = normalizeText(query, "Query is required", 100);
        int boundedLimit = Math.max(1, Math.min(limit, 100));
        PageRequest pageable = PageRequest.of(0, boundedLimit);
        String target = field == null ? "title" : field.trim().toLowerCase();

        List<BoardPost> posts = switch (target) {
            case "content" -> boardPostRepository.searchByContent(company.getCompanyId(), normalizedQuery, pageable);
            default -> boardPostRepository.searchByTitle(company.getCompanyId(), normalizedQuery, pageable);
        };
        return posts.stream().map(this::toResponse).toList();
    }

    @Transactional
    public BoardPostResponse updatePost(String companyName,
                                        Long postId,
                                        BoardPostUpdateRequest request,
                                        Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Company company = companySearchService.resolveActiveCompany(companyName);
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        BoardPost post = boardPostRepository.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        ensureOwnership(company, post, userId);
        post.setTitle(profanityMasker.mask(normalizeText(request == null ? null : request.getTitle(), "Title is required", 120)));
        post.setContent(profanityMasker.mask(normalizeText(request == null ? null : request.getContent(), "Content is required", 3000)));
        return toResponse(post);
    }

    @Transactional
    public void deletePost(String companyName, Long postId, Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Company company = companySearchService.resolveActiveCompany(companyName);
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        BoardPost post = boardPostRepository.findById(postId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        ensureOwnership(company, post, userId);
        boardPostRepository.delete(post);
    }

    @Transactional
    public long purgeOldPosts(long retentionDays) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1L, retentionDays));
        return boardPostRepository.deleteByCreatedAtBefore(cutoff);
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

    private void ensureOwnership(Company company, BoardPost post, Long userId) {
        if (post.getCompany() == null || !post.getCompany().getCompanyId().equals(company.getCompanyId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post does not belong to company");
        }
        if (post.getUser() == null || !post.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only author can modify post");
        }
    }

    private void enforceSearchCooldown(String sessionKeyRaw) {
        String sessionKey = sessionKeyRaw == null || sessionKeyRaw.isBlank() ? "anon" : sessionKeyRaw.trim();
        long now = System.currentTimeMillis();
        Long last = lastBoardSearchAtBySession.put(sessionKey, now);
        if (last != null && now - last < SEARCH_COOLDOWN_MS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Board search cooldown: wait 3 seconds");
        }
        long staleThreshold = SEARCH_COOLDOWN_MS * 20L;
        lastBoardSearchAtBySession.entrySet().removeIf(entry -> now - entry.getValue() > staleThreshold);
    }

    private BoardPostResponse toResponse(BoardPost post) {
        String email = post.getUser() == null ? null : post.getUser().getEmail();
        String authorName = email == null || email.isBlank()
            ? "user"
            : email.split("@")[0];
        return new BoardPostResponse(
            post.getPostId(),
            post.getCompany().getCompanyId(),
            post.getCompany().getCompanyName(),
            post.getTitle(),
            post.getContent(),
            post.getUser() == null ? null : post.getUser().getId(),
            authorName,
            post.getCreatedAt()
        );
    }
}
