package com.whennawa.service;

import com.whennawa.dto.board.BoardPageResponse;
import com.whennawa.dto.interview.InterviewReviewItem;
import com.whennawa.dto.interview.InterviewReviewSort;
import com.whennawa.entity.Company;
import com.whennawa.entity.InterviewReview;
import com.whennawa.entity.InterviewReviewLike;
import com.whennawa.entity.RollingReport;
import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.User;
import com.whennawa.entity.enums.InterviewDifficulty;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.InterviewReviewLikeRepository;
import com.whennawa.repository.InterviewReviewRepository;
import com.whennawa.repository.UserRepository;
import com.whennawa.util.CompanyNameNormalizer;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InterviewReviewService {
    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final InterviewReviewRepository interviewReviewRepository;
    private final InterviewReviewLikeRepository interviewReviewLikeRepository;
    private final ProfanityMasker profanityMasker;

    @Transactional
    public void createForRegularReport(StepDateReport report,
                                       Long userId,
                                       String contentRaw,
                                       InterviewDifficulty difficulty) {
        String content = normalizeOptionalContent(contentRaw);
        if (content == null || report == null || report.getCompany() == null) {
            return;
        }
        InterviewReview review = new InterviewReview();
        review.setCompany(report.getCompany());
        review.setUser(resolveOptionalUser(userId));
        review.setReport(report);
        review.setRollingReport(null);
        review.setRecruitmentMode(report.getRecruitmentMode() == null ? RecruitmentMode.REGULAR : report.getRecruitmentMode());
        review.setStepName(resolveStepName(report.getStepName()));
        review.setDifficulty(difficulty == null ? InterviewDifficulty.MEDIUM : difficulty);
        review.setContent(profanityMasker.mask(content));
        review.setActive(true);
        review.setLikeCount(0);
        interviewReviewRepository.save(review);
    }

    @Transactional
    public void createOrUpdateForRegularReport(StepDateReport report,
                                               Long userId,
                                               String contentRaw,
                                               InterviewDifficulty difficulty) {
        String content = normalizeOptionalContent(contentRaw);
        if (content == null || report == null || report.getCompany() == null) {
            deactivateForRegularReport(report == null ? null : report.getReportId());
            return;
        }
        InterviewReview review = interviewReviewRepository.findByReportReportIdAndIsActiveTrue(report.getReportId())
            .orElseGet(InterviewReview::new);
        review.setCompany(report.getCompany());
        review.setUser(resolveOptionalUser(userId));
        review.setReport(report);
        review.setRollingReport(null);
        review.setRecruitmentMode(report.getRecruitmentMode() == null ? RecruitmentMode.REGULAR : report.getRecruitmentMode());
        review.setStepName(resolveStepName(report.getStepName()));
        review.setDifficulty(difficulty == null ? InterviewDifficulty.MEDIUM : difficulty);
        review.setContent(profanityMasker.mask(content));
        review.setActive(true);
        if (review.getLikeCount() == null) {
            review.setLikeCount(0);
        }
        interviewReviewRepository.save(review);
    }

    @Transactional
    public void createForRollingReport(RollingReport report,
                                       Long userId,
                                       String contentRaw,
                                       InterviewDifficulty difficulty) {
        String content = normalizeOptionalContent(contentRaw);
        if (content == null || report == null || report.getCompany() == null) {
            return;
        }
        InterviewReview review = new InterviewReview();
        review.setCompany(report.getCompany());
        review.setUser(resolveOptionalUser(userId));
        review.setReport(null);
        review.setRollingReport(report);
        review.setRecruitmentMode(RecruitmentMode.ROLLING);
        review.setStepName(resolveStepName(report.getStepName()));
        review.setDifficulty(difficulty == null ? InterviewDifficulty.MEDIUM : difficulty);
        review.setContent(profanityMasker.mask(content));
        review.setActive(true);
        review.setLikeCount(0);
        interviewReviewRepository.save(review);
    }

    @Transactional
    public void createOrUpdateForRollingReport(RollingReport report,
                                               Long userId,
                                               String contentRaw,
                                               InterviewDifficulty difficulty) {
        String content = normalizeOptionalContent(contentRaw);
        if (content == null || report == null || report.getCompany() == null) {
            deactivateForRollingReport(report == null ? null : report.getReportId());
            return;
        }
        InterviewReview review = interviewReviewRepository.findByRollingReportReportIdAndIsActiveTrue(report.getReportId())
            .orElseGet(InterviewReview::new);
        review.setCompany(report.getCompany());
        review.setUser(resolveOptionalUser(userId));
        review.setReport(null);
        review.setRollingReport(report);
        review.setRecruitmentMode(RecruitmentMode.ROLLING);
        review.setStepName(resolveStepName(report.getStepName()));
        review.setDifficulty(difficulty == null ? InterviewDifficulty.MEDIUM : difficulty);
        review.setContent(profanityMasker.mask(content));
        review.setActive(true);
        if (review.getLikeCount() == null) {
            review.setLikeCount(0);
        }
        interviewReviewRepository.save(review);
    }

    @Transactional
    public void deactivateForRegularReport(Long reportId) {
        if (reportId == null) {
            return;
        }
        interviewReviewRepository.findByReportReportIdAndIsActiveTrue(reportId).ifPresent(review -> review.setActive(false));
    }

    @Transactional
    public void deactivateForRollingReport(Long reportId) {
        if (reportId == null) {
            return;
        }
        interviewReviewRepository.findByRollingReportReportIdAndIsActiveTrue(reportId).ifPresent(review -> review.setActive(false));
    }

    @Transactional(readOnly = true)
    public List<InterviewReviewItem> listTop(String companyName, int limit, InterviewReviewSort sort, Long currentUserId) {
        Company company = resolveCompany(companyName);
        int boundedLimit = Math.max(1, Math.min(limit, 10));
        Page<InterviewReview> page = interviewReviewRepository.findByCompanyCompanyIdAndIsActiveTrue(
            company.getCompanyId(),
            PageRequest.of(0, boundedLimit, resolveSort(sort))
        );
        return toItems(page.getContent(), currentUserId);
    }

    @Transactional(readOnly = true)
    public List<String> listStepNames(String companyName, RecruitmentMode recruitmentMode) {
        Company company = resolveCompany(companyName);
        List<String> stepNames = recruitmentMode == null
            ? interviewReviewRepository.findDistinctStepNamesByCompanyId(company.getCompanyId())
            : interviewReviewRepository.findDistinctStepNamesByCompanyIdAndMode(company.getCompanyId(), recruitmentMode);
        return stepNames.stream()
            .map(stepName -> stepName == null ? "" : stepName.trim())
            .filter(stepName -> !stepName.isBlank())
            .toList();
    }

    @Transactional(readOnly = true)
    public BoardPageResponse<InterviewReviewItem> listPage(String companyName,
                                                           Integer page,
                                                           Integer size,
                                                           RecruitmentMode recruitmentMode,
                                                           String stepName,
                                                           InterviewReviewSort sort,
                                                           Long currentUserId) {
        Company company = resolveCompany(companyName);
        int boundedPage = Math.max(0, page == null ? 0 : page);
        int boundedSize = clampPageSize(size, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        String normalizedStepName = normalizeOptionalStepName(stepName);
        Page<InterviewReview> result;
        if (recruitmentMode == null && normalizedStepName == null) {
            result = interviewReviewRepository.findByCompanyCompanyIdAndIsActiveTrue(
                company.getCompanyId(),
                PageRequest.of(boundedPage, boundedSize, resolveSort(sort))
            );
        } else if (recruitmentMode == null) {
            result = interviewReviewRepository.findByCompanyCompanyIdAndIsActiveTrueAndStepName(
                company.getCompanyId(),
                normalizedStepName,
                PageRequest.of(boundedPage, boundedSize, resolveSort(sort))
            );
        } else if (normalizedStepName == null) {
            result = interviewReviewRepository.findByCompanyCompanyIdAndIsActiveTrueAndRecruitmentMode(
                company.getCompanyId(),
                recruitmentMode,
                PageRequest.of(boundedPage, boundedSize, resolveSort(sort))
            );
        } else {
            result = interviewReviewRepository.findByCompanyCompanyIdAndIsActiveTrueAndRecruitmentModeAndStepName(
                company.getCompanyId(),
                recruitmentMode,
                normalizedStepName,
                PageRequest.of(boundedPage, boundedSize, resolveSort(sort))
            );
        }
        return new BoardPageResponse<>(
            toItems(result.getContent(), currentUserId),
            boundedPage,
            boundedSize,
            result.hasNext(),
            result.getTotalPages(),
            result.getTotalElements()
        );
    }

    @Transactional
    public InterviewReviewItem like(Long reviewId, Long userId) {
        User user = resolveUser(userId);
        InterviewReview review = resolveReview(reviewId);
        if (interviewReviewLikeRepository.existsByReviewReviewIdAndUser_Id(reviewId, user.getId())) {
            long deleted = interviewReviewLikeRepository.deleteByReviewReviewIdAndUser_Id(reviewId, user.getId());
            if (deleted > 0) {
                int current = review.getLikeCount() == null ? 0 : review.getLikeCount();
                review.setLikeCount(Math.max(0, current - 1));
            }
            return toItem(review, Collections.emptySet());
        }

        if (!interviewReviewLikeRepository.existsByReviewReviewIdAndUser_Id(reviewId, user.getId())) {
            InterviewReviewLike like = new InterviewReviewLike();
            like.setReview(review);
            like.setUser(user);
            try {
                interviewReviewLikeRepository.save(like);
                review.setLikeCount(Math.max(0, review.getLikeCount() == null ? 0 : review.getLikeCount()) + 1);
            } catch (DataIntegrityViolationException ignored) {
                // idempotent when request races
            }
        }
        return toItem(review, Set.of(review.getReviewId()));
    }

    @Transactional
    public InterviewReviewItem unlike(Long reviewId, Long userId) {
        User user = resolveUser(userId);
        InterviewReview review = resolveReview(reviewId);
        long deleted = interviewReviewLikeRepository.deleteByReviewReviewIdAndUser_Id(reviewId, user.getId());
        if (deleted > 0) {
            int current = review.getLikeCount() == null ? 0 : review.getLikeCount();
            review.setLikeCount(Math.max(0, current - 1));
        }
        return toItem(review, Collections.emptySet());
    }

    private List<InterviewReviewItem> toItems(Collection<InterviewReview> reviews, Long currentUserId) {
        if (reviews == null || reviews.isEmpty()) {
            return List.of();
        }
        Set<Long> likedReviewIds = resolveLikedReviewIds(currentUserId, reviews.stream()
            .map(InterviewReview::getReviewId)
            .filter(id -> id != null)
            .toList());
        return reviews.stream()
            .map(review -> toItem(review, likedReviewIds))
            .toList();
    }

    private InterviewReviewItem toItem(InterviewReview review, Set<Long> likedReviewIds) {
        if (review == null) {
            return null;
        }
        Company company = review.getCompany();
        int likeCount = Math.max(0, review.getLikeCount() == null ? 0 : review.getLikeCount());
        boolean likedByMe = review.getReviewId() != null
            && likedReviewIds != null
            && likedReviewIds.contains(review.getReviewId());
        return new InterviewReviewItem(
            review.getReviewId(),
            company == null ? null : company.getCompanyId(),
            company == null ? null : company.getCompanyName(),
            review.getRecruitmentMode(),
            review.getStepName(),
            review.getDifficulty(),
            review.getContent(),
            likeCount,
            likedByMe,
            review.getCreatedAt()
        );
    }

    private Set<Long> resolveLikedReviewIds(Long userId, Collection<Long> reviewIds) {
        if (userId == null || reviewIds == null || reviewIds.isEmpty()) {
            return Collections.emptySet();
        }
        return interviewReviewLikeRepository.findByUser_IdAndReviewReviewIdIn(userId, reviewIds).stream()
            .map(like -> like.getReview() == null ? null : like.getReview().getReviewId())
            .filter(id -> id != null)
            .collect(Collectors.toSet());
    }

    private String normalizeOptionalContent(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Interview review is too long");
        }
        return trimmed;
    }

    private String normalizeOptionalStepName(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String resolveStepName(String stepName) {
        if (stepName == null || stepName.isBlank()) {
            return "면접";
        }
        String trimmed = stepName.trim();
        return trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
    }

    private Company resolveCompany(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        Company exact = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
        if (exact != null) {
            return exact;
        }
        String normalizedTarget = CompanyNameNormalizer.normalizeKey(companyName);
        Company normalized = companyRepository.findAll().stream()
            .filter(Company::isActive)
            .filter(company -> company.getCompanyName() != null)
            .filter(company -> CompanyNameNormalizer.normalizeKey(company.getCompanyName()).equals(normalizedTarget))
            .findFirst()
            .orElse(null);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found");
        }
        return normalized;
    }

    private InterviewReview resolveReview(Long reviewId) {
        return interviewReviewRepository.findByReviewIdAndIsActiveTrue(reviewId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found"));
    }

    private User resolveOptionalUser(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId).orElse(null);
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));
    }

    private Sort resolveSort(InterviewReviewSort sort) {
        InterviewReviewSort resolved = sort == null ? InterviewReviewSort.LIKES : sort;
        if (resolved == InterviewReviewSort.LATEST) {
            return Sort.by(Sort.Order.desc("createdAt"));
        }
        return Sort.by(Sort.Order.desc("likeCount"), Sort.Order.desc("createdAt"));
    }

    private int clampPageSize(Integer rawSize, int defaultSize, int maxSize) {
        if (rawSize == null) return defaultSize;
        return Math.max(1, Math.min(rawSize, maxSize));
    }
}

