package com.whennawa.controller;

import com.whennawa.dto.board.BoardPageResponse;
import com.whennawa.dto.interview.InterviewReviewItem;
import com.whennawa.dto.interview.InterviewReviewSort;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.InterviewReviewService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class InterviewReviewController {
    private final InterviewReviewService interviewReviewService;

    @GetMapping("/api/companies/{companyName}/interview-reviews/top")
    public List<InterviewReviewItem> top(@PathVariable("companyName") String companyName,
                                         @RequestParam(value = "limit", defaultValue = "3") Integer limit,
                                         @RequestParam(value = "sort", defaultValue = "LIKES") InterviewReviewSort sort,
                                         Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        return interviewReviewService.listTop(companyName, limit == null ? 3 : limit, sort, principal == null ? null : principal.getUserId());
    }

    @GetMapping("/api/companies/{companyName}/interview-reviews/steps")
    public List<String> steps(@PathVariable("companyName") String companyName,
                              @RequestParam(value = "mode", required = false) RecruitmentMode mode) {
        return interviewReviewService.listStepNames(companyName, mode);
    }

    @GetMapping("/api/companies/{companyName}/interview-reviews")
    public BoardPageResponse<InterviewReviewItem> list(@PathVariable("companyName") String companyName,
                                                        @RequestParam(value = "page", defaultValue = "0") Integer page,
                                                        @RequestParam(value = "size", defaultValue = "20") Integer size,
                                                        @RequestParam(value = "mode", required = false) RecruitmentMode mode,
                                                        @RequestParam(value = "stepName", required = false) String stepName,
                                                        @RequestParam(value = "sort", defaultValue = "LIKES") InterviewReviewSort sort,
                                                        Authentication authentication) {
        UserPrincipal principal = extractPrincipal(authentication);
        return interviewReviewService.listPage(companyName, page, size, mode, stepName, sort, principal == null ? null : principal.getUserId());
    }

    @PostMapping("/api/interview-reviews/{reviewId}/like")
    @ResponseStatus(HttpStatus.OK)
    public InterviewReviewItem like(@PathVariable("reviewId") Long reviewId,
                                    Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return interviewReviewService.like(reviewId, principal.getUserId());
    }

    @DeleteMapping("/api/interview-reviews/{reviewId}/like")
    @ResponseStatus(HttpStatus.OK)
    public InterviewReviewItem unlike(@PathVariable("reviewId") Long reviewId,
                                      Authentication authentication) {
        UserPrincipal principal = requirePrincipal(authentication);
        return interviewReviewService.unlike(reviewId, principal.getUserId());
    }

    private UserPrincipal requirePrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return principal;
    }

    private UserPrincipal extractPrincipal(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return null;
        }
        return principal;
    }
}
