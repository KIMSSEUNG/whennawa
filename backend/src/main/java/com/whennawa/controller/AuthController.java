package com.whennawa.controller;

import com.whennawa.dto.auth.AuthTokensResponse;
import com.whennawa.dto.auth.UserInfoResponse;
import com.whennawa.entity.User;
import com.whennawa.security.JwtService;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.AuthCookieService;
import com.whennawa.service.AccountService;
import com.whennawa.exception.AuthTokenException;
import com.whennawa.repository.UserRepository;
import com.whennawa.service.RefreshTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth/api")
@Slf4j
public class AuthController {
    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final AuthCookieService authCookieService;
    private final AccountService accountService;
    private final UserRepository userRepository;

    public AuthController(RefreshTokenService refreshTokenService,
                          JwtService jwtService,
                          AuthCookieService authCookieService,
                          AccountService accountService,
                          UserRepository userRepository) {
        this.refreshTokenService = refreshTokenService;
        this.jwtService = jwtService;
        this.authCookieService = authCookieService;
        this.accountService = accountService;
        this.userRepository = userRepository;
    }

    @PostMapping("/refresh")
    public AuthTokensResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = authCookieService.resolveRefreshToken(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing refresh token");
        }
        try {
            RefreshTokenService.RotationResult rotation = refreshTokenService.rotateToken(refreshToken);
            String accessToken = jwtService.createAccessToken(rotation.user());
            authCookieService.setAuthCookies(response, accessToken, rotation.refreshToken());
            return new AuthTokensResponse(accessToken);
        } catch (AuthTokenException ex) {
            authCookieService.clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token", ex);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                       HttpServletResponse response,
                                       Authentication authentication) {
        String refreshToken = authCookieService.resolveRefreshToken(request);
        Long userId = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            userId = principal.getUserId();
        }
        if (userId == null && refreshToken != null && !refreshToken.isBlank()) {
            try {
                Claims claims = jwtService.parseToken(refreshToken);
                if (jwtService.isRefreshToken(claims)) {
                    userId = jwtService.getUserId(claims);
                }
            } catch (JwtException | IllegalArgumentException ex) {
                // Best-effort; fall back to token deletion by hash.
                log.error("logout error : {}",ex.getMessage());
            }
        }
        if (userId != null) {
            refreshTokenService.deleteAllTokensForUser(userId);
        } else if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.deleteToken(refreshToken);
        }
        authCookieService.clearAuthCookies(response);
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        ResponseCookie jsession = ResponseCookie.from("JSESSIONID", "")
            .path("/")
            .maxAge(Duration.ZERO)
            .build();
        response.addHeader("Set-Cookie", jsession.toString());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/withdraw")
    public ResponseEntity<Void> withdraw(Authentication authentication,
                                         HttpServletResponse response) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        accountService.withdraw(principal.getUserId());
        authCookieService.clearAuthCookies(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserInfoResponse me(Authentication authentication) {
        if (authentication != null) {
            log.debug("me auth class={} principal class={}",
                authentication.getClass().getName(),
                authentication.getPrincipal() == null ? "null" : authentication.getPrincipal().getClass().getName());
        } else {
            log.debug("me auth is null");
        }
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return new UserInfoResponse();
        }
        User user = userRepository.findByIdAndDeletedAtIsNull(principal.getUserId()).orElse(null);
        if (user == null) {
            return new UserInfoResponse();
        }
        return new UserInfoResponse(user.getId(), user.getEmail(), user.getNickname(), principal.getRole());
    }
}





