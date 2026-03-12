package com.whennawa.repository;

import com.whennawa.entity.UserBlock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {
    List<UserBlock> findByBlocker_IdAndIsActiveTrueOrderByBlockIdDesc(Long blockerUserId);

    Optional<UserBlock> findByBlocker_IdAndBlocked_Id(Long blockerUserId, Long blockedUserId);

    boolean existsByBlocker_IdAndBlocked_IdAndIsActiveTrue(Long blockerUserId, Long blockedUserId);
}
