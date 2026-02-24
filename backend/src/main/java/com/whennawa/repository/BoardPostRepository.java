package com.whennawa.repository;

import com.whennawa.entity.BoardPost;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BoardPostRepository extends JpaRepository<BoardPost, Long> {
    List<BoardPost> findByCompanyCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    @Query("""
        select p
        from BoardPost p
        where p.company.companyId = :companyId
          and lower(p.title) like lower(concat('%', :q, '%'))
        order by p.createdAt desc
        """)
    List<BoardPost> searchByTitle(@Param("companyId") Long companyId, @Param("q") String q, Pageable pageable);

    @Query("""
        select p
        from BoardPost p
        where p.company.companyId = :companyId
          and lower(p.content) like lower(concat('%', :q, '%'))
        order by p.createdAt desc
        """)
    List<BoardPost> searchByContent(@Param("companyId") Long companyId, @Param("q") String q, Pageable pageable);

    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
