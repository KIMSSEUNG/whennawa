package com.whennawa.repository;

import com.whennawa.entity.BoardPost;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BoardPostRepository extends JpaRepository<BoardPost, Long> {
    Page<BoardPost> findByCompanyCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    @Query("""
        select p
        from BoardPost p
        where p.company.companyId = :companyId
          and lower(p.title) like lower(concat('%', :q, '%'))
        order by p.createdAt desc
        """)
    Page<BoardPost> searchByTitle(@Param("companyId") Long companyId, @Param("q") String q, Pageable pageable);

    @Query("""
        select p
        from BoardPost p
        where p.company.companyId = :companyId
          and lower(p.content) like lower(concat('%', :q, '%'))
        order by p.createdAt desc
        """)
    Page<BoardPost> searchByContent(@Param("companyId") Long companyId, @Param("q") String q, Pageable pageable);

    Optional<BoardPost> findByPostIdAndCompanyCompanyId(Long postId, Long companyId);

    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
