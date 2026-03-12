package com.whennawa.repository;

import com.whennawa.entity.InterviewReviewLike;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewReviewLikeRepository extends JpaRepository<InterviewReviewLike, Long> {
    boolean existsByReviewReviewIdAndUser_Id(Long reviewId, Long userId);

    long deleteByReviewReviewIdAndUser_Id(Long reviewId, Long userId);

    List<InterviewReviewLike> findByUser_IdAndReviewReviewIdIn(Long userId, Collection<Long> reviewIds);
}
