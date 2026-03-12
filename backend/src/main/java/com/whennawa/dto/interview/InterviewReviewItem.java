package com.whennawa.dto.interview;

import com.whennawa.entity.enums.InterviewDifficulty;
import com.whennawa.entity.enums.RecruitmentMode;
import java.time.LocalDateTime;

public record InterviewReviewItem(
    Long reviewId,
    Long companyId,
    String companyName,
    RecruitmentMode recruitmentMode,
    String stepName,
    InterviewDifficulty difficulty,
    String content,
    int likeCount,
    boolean likedByMe,
    LocalDateTime createdAt
) {
}
