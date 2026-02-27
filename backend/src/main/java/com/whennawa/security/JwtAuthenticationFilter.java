package com.whennawa.security;

import com.whennawa.entity.User;
import com.whennawa.repository.UserRepository;
import com.whennawa.service.AuthCookieService;
import com.whennawa.service.RefreshTokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String ACCESS_COOKIE = "access_token";

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final AuthCookieService authCookieService;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   UserRepository userRepository,
                                   RefreshTokenService refreshTokenService,
                                   AuthCookieService authCookieService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
        this.authCookieService = authCookieService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (request.getRequestURI().startsWith("/auth/api/refresh")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = resolveAccessToken(request);
        if (token == null) {
            if (tryAuthenticateWithRefresh(request, response)) {
                filterChain.doFilter(request, response);
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtService.parseToken(token);

            if (!jwtService.isAccessToken(claims)) {
                if (tryAuthenticateWithRefresh(request, response)) {
                    filterChain.doFilter(request, response);
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }
            Long userId = jwtService.getUserId(claims);
            Optional<User> userOpt = userRepository.findByIdAndDeletedAtIsNull(userId);
            if (userOpt.isEmpty()) {
                if (tryAuthenticateWithRefresh(request, response)) {
                    filterChain.doFilter(request, response);
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }
            authenticate(userOpt.get());
        } catch (JwtException | IllegalArgumentException ex) {
            // Invalid token; continue without authentication.
            log.warn("JWT Filter authentication fail");
            SecurityContextHolder.clearContext();
            if (tryAuthenticateWithRefresh(request, response)) {
                filterChain.doFilter(request, response);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * ?�더 or 쿠키?�서 accesstoken 추출
     */
    private String resolveAccessToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        String cookieToken = authCookieService.resolveAccessToken(request);
        if (cookieToken != null) return cookieToken;
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (ACCESS_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private boolean tryAuthenticateWithRefresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = authCookieService.resolveRefreshToken(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            return false;
        }
        try {
            User user = refreshTokenService.validateTokenAndGetUser(refreshToken);
            String accessToken = jwtService.createAccessToken(user);
            authCookieService.setAccessCookie(response, accessToken);
            authenticate(user);
            return true;
        } catch (Exception ex) {
            SecurityContextHolder.clearContext();
            return false;
        }
    }

    private void authenticate(User user) {
        String role = user.getRole() == null ? "USER" : user.getRole().name();
        UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail(), role);
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
