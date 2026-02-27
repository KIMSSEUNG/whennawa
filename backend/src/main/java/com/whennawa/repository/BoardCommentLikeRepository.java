package com.whennawa.repository;

import com.whennawa.entity.BoardCommentLike;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardCommentLikeRepository extends JpaRepository<BoardCommentLike, Long> {
    boolean existsByCommentCommentIdAndUser_Id(Long commentId, Long userId);

    long deleteByCommentCommentIdAndUser_Id(Long commentId, Long userId);

    long deleteByCommentCommentId(Long commentId);

    List<BoardCommentLike> findByUser_IdAndCommentCommentIdIn(Long userId, Collection<Long> commentIds);
}
