package com.whennawa.repository;

import com.whennawa.entity.UserRefreshToken;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRefreshTokenRepository extends JpaRepository<UserRefreshToken, Long> {
    Optional<UserRefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update UserRefreshToken t set t.revokedAt = :now where t.user.id = :userId and t.revokedAt is null")
    int revokeAllActive(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("delete from UserRefreshToken t where t.expiresAt <= :now or (t.revokedAt is not null and t.revokedAt < :cutoff)")
    int deleteExpiredOrRevokedBefore(@Param("now") LocalDateTime now, @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("delete from UserRefreshToken t where t.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from UserRefreshToken t where t.tokenHash = :hash")
    int deleteByTokenHash(@Param("hash") String hash);
}

