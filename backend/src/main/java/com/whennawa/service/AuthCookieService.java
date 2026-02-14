package com.whennawa.service;

import com.whennawa.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class AuthCookieService {
    public static final String ACCESS_COOKIE = "access_token";
    public static final String REFRESH_COOKIE = "refresh_token";
    public static final String LOGIN_NEXT_COOKIE = "login_next";

    private final AppProperties appProperties;

    public AuthCookieService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        Duration accessTtl = Duration.ofMinutes(appProperties.getJwt().getAccessTtlMinutes());
        Duration refreshTtl = Duration.ofDays(appProperties.getJwt().getRefreshTtlDays());
        addCookie(response, ACCESS_COOKIE, accessToken, accessTtl, true);
        addCookie(response, REFRESH_COOKIE, refreshToken, refreshTtl, true);
    }

    public void clearAuthCookies(HttpServletResponse response) {
        addCookie(response, ACCESS_COOKIE, "", Duration.ZERO, true);
        addCookie(response, REFRESH_COOKIE, "", Duration.ZERO, true);
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        return resolveCookie(request, REFRESH_COOKIE);
    }

    public String resolveAccessToken(HttpServletRequest request) {
        return resolveCookie(request, ACCESS_COOKIE);
    }

    public void setLoginNextCookie(HttpServletResponse response, String nextPath) {
        addCookie(response, LOGIN_NEXT_COOKIE, nextPath, Duration.ofMinutes(10), true);
    }

    public String resolveLoginNext(HttpServletRequest request) {
        return resolveCookie(request, LOGIN_NEXT_COOKIE);
    }

    public void clearLoginNextCookie(HttpServletResponse response) {
        addCookie(response, LOGIN_NEXT_COOKIE, "", Duration.ZERO, true);
    }

    private String resolveCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void addCookie(HttpServletResponse response,
                           String name,
                           String value,
                           Duration maxAge,
                           boolean httpOnly) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
            .path("/")
            .httpOnly(httpOnly)
            .sameSite("Lax")
            .maxAge(maxAge)
            .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}

