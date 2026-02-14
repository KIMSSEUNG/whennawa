package com.whennawa.security;

import com.whennawa.config.AppProperties;
import com.whennawa.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final Key signingKey;
    private final long accessTtlMinutes;
    private final long refreshTtlDays;

    public JwtService(AppProperties appProperties) {
        AppProperties.Jwt jwt = appProperties.getJwt();
        if (jwt == null || jwt.getSecret() == null || jwt.getSecret().isBlank()) {
            throw new IllegalStateException("app.jwt.secret is required");
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(jwt.getSecret());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("app.jwt.secret must be base64", ex);
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTtlMinutes = jwt.getAccessTtlMinutes();
        this.refreshTtlDays = jwt.getRefreshTtlDays();
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(accessTtlMinutes * 60);
        return Jwts.builder()
            .setSubject(Long.toString(user.getId()))
            .claim("email", user.getEmail())
            .claim("role", user.getRole() == null ? "USER" : user.getRole().name())
            .claim("type", "access")
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(expiresAt))
            .signWith(signingKey, SignatureAlgorithm.HS256)
            .compact();
    }

    public String createRefreshToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(refreshTtlDays * 24 * 60 * 60);
        return Jwts.builder()
            .setSubject(Long.toString(user.getId()))
            .claim("email", user.getEmail())
            .claim("type", "refresh")
            .setId(UUID.randomUUID().toString())
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(expiresAt))
            .signWith(signingKey, SignatureAlgorithm.HS256)
            .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(signingKey)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    public boolean isAccessToken(Claims claims) {
        return "access".equals(claims.get("type"));
    }

    public boolean isRefreshToken(Claims claims) {
        return "refresh".equals(claims.get("type"));
    }

    public Long getUserId(Claims claims) {
        return Long.parseLong(claims.getSubject());
    }

    public Instant getExpirationInstant(Claims claims) {
        return claims.getExpiration().toInstant().atZone(ZoneOffset.UTC).toInstant();
    }

    public long getAccessTtlMinutes() {
        return accessTtlMinutes;
    }

    public long getRefreshTtlDays() {
        return refreshTtlDays;
    }
}

