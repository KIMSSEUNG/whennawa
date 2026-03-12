package com.whennawa.repository;

import com.whennawa.entity.CareerBoardPost;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CareerBoardPostRepository extends JpaRepository<CareerBoardPost, Long> {
    Page<CareerBoardPost> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
        select p
        from CareerBoardPost p
        where lower(p.title) like lower(concat('%', :q, '%'))
        order by p.createdAt desc
        """)
    Page<CareerBoardPost> searchByTitle(@Param("q") String q, Pageable pageable);

    @Query("""
        select p
        from CareerBoardPost p
        where lower(p.content) like lower(concat('%', :q, '%'))
        order by p.createdAt desc
        """)
    Page<CareerBoardPost> searchByContent(@Param("q") String q, Pageable pageable);

    Optional<CareerBoardPost> findByPostId(Long postId);

    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
