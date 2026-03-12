package com.whennawa.repository;

import com.whennawa.entity.CareerBoardComment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerBoardCommentRepository extends JpaRepository<CareerBoardComment, Long> {
    List<CareerBoardComment> findByPostPostId(Long postId);

    Page<CareerBoardComment> findByPostPostIdAndParentCommentIsNullOrderByCreatedAtDesc(Long postId, Pageable pageable);

    List<CareerBoardComment> findByParentCommentCommentIdInOrderByCreatedAtAsc(Collection<Long> parentIds);

    List<CareerBoardComment> findByParentCommentCommentId(Long parentCommentId);

    Optional<CareerBoardComment> findByCommentIdAndPostPostId(Long commentId, Long postId);
}
