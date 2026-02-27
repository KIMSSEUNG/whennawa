package com.whennawa.repository;

import com.whennawa.entity.BoardComment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardCommentRepository extends JpaRepository<BoardComment, Long> {
    List<BoardComment> findByPostPostId(Long postId);

    Page<BoardComment> findByPostPostIdAndParentCommentIsNullOrderByCreatedAtDesc(Long postId, Pageable pageable);

    List<BoardComment> findByParentCommentCommentIdInOrderByCreatedAtAsc(Collection<Long> parentIds);

    List<BoardComment> findByParentCommentCommentId(Long parentCommentId);

    Optional<BoardComment> findByCommentIdAndPostPostId(Long commentId, Long postId);
}
