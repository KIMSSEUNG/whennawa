package com.whennawa.service;

import com.whennawa.entity.User;
import com.whennawa.entity.UserRefreshToken;
import com.whennawa.exception.AuthTokenException;
import com.whennawa.repository.UserRefreshTokenRepository;
import com.whennawa.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {
    private final UserRefreshTokenRepository tokenRepository;
    private final JwtService jwtService;

    public RefreshTokenService(UserRefreshTokenRepository tokenRepository, JwtService jwtService) {
        this.tokenRepository = tokenRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public IssuedToken issueToken(User user) {
        String refreshToken = jwtService.createRefreshToken(user);
        Claims claims = jwtService.parseToken(refreshToken);
        LocalDateTime expiresAt = LocalDateTime.ofInstant(
            claims.getExpiration().toInstant(), ZoneOffset.UTC);
        String hash = hash(refreshToken);
        tokenRepository.save(new UserRefreshToken(user, hash, expiresAt));
        return new IssuedToken(refreshToken, expiresAt);
    }

    @Transactional
    public RotationResult rotateToken(String refreshToken) {
        Claims claims = parseAndValidate(refreshToken);
        String hash = hash(refreshToken);
        Optional<UserRefreshToken> storedOpt = tokenRepository.findByTokenHash(hash);
        UserRefreshToken stored = storedOpt.orElseThrow(() -> new AuthTokenException("Refresh token not found"));
        if (stored.isRevoked()) {
            throw new AuthTokenException("Refresh token revoked");
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (stored.getExpiresAt().isBefore(now)) {
            stored.revoke(now);
            tokenRepository.save(stored);
            throw new AuthTokenException("Refresh token expired");
        }
        Long tokenUserId = jwtService.getUserId(claims);
        if (!stored.getUser().getId().equals(tokenUserId)) {
            throw new AuthTokenException("Refresh token user mismatch");
        }
        stored.revoke(now);
        tokenRepository.save(stored);
        IssuedToken newToken = issueToken(stored.getUser());
        return new RotationResult(stored.getUser(), newToken.token(), newToken.expiresAt());
    }

    @Transactional
    public void revokeToken(String refreshToken) {
        String hash = hash(refreshToken);
        Optional<UserRefreshToken> storedOpt = tokenRepository.findByTokenHash(hash);
        if (storedOpt.isEmpty()) {
            return;
        }
        UserRefreshToken stored = storedOpt.get();
        if (!stored.isRevoked()) {
            stored.revoke(LocalDateTime.now(ZoneOffset.UTC));
            tokenRepository.save(stored);
        }
    }

    @Transactional
    public void deleteAllTokensForUser(Long userId) {
        tokenRepository.deleteAllByUserId(userId);
    }

    @Transactional
    public void deleteToken(String refreshToken) {
        String hash = hash(refreshToken);
        tokenRepository.deleteByTokenHash(hash);
    }

    private Claims parseAndValidate(String refreshToken) {
        try {
            Claims claims = jwtService.parseToken(refreshToken);
            if (!jwtService.isRefreshToken(claims)) {
                throw new AuthTokenException("Not a refresh token");
            }
            Instant expiresAt = claims.getExpiration().toInstant();
            if (expiresAt.isBefore(Instant.now())) {
                throw new AuthTokenException("Refresh token expired");
            }
            return claims;
        } catch (JwtException | IllegalArgumentException ex) {
            throw new AuthTokenException("Invalid refresh token", ex);
        }
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    public record IssuedToken(String token, LocalDateTime expiresAt) {}

    public record RotationResult(User user, String refreshToken, LocalDateTime expiresAt) {}
}

