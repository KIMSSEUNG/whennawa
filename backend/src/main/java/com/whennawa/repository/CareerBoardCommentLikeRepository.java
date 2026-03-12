package com.whennawa.repository;

import com.whennawa.entity.CareerBoardCommentLike;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerBoardCommentLikeRepository extends JpaRepository<CareerBoardCommentLike, Long> {
    boolean existsByCommentCommentIdAndUser_Id(Long commentId, Long userId);

    long deleteByCommentCommentIdAndUser_Id(Long commentId, Long userId);

    long deleteByCommentCommentId(Long commentId);

    List<CareerBoardCommentLike> findByUser_IdAndCommentCommentIdIn(Long userId, Collection<Long> commentIds);
}
