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
        addCookie(
            response,
            ACCESS_COOKIE,
            accessToken,
            accessTtl,
            true,
            appProperties.getAuth().getAuthCookieSameSite()
        );
        addCookie(
            response,
            REFRESH_COOKIE,
            refreshToken,
            refreshTtl,
            true,
            appProperties.getAuth().getAuthCookieSameSite()
        );
    }

    public void setAccessCookie(HttpServletResponse response, String accessToken) {
        Duration accessTtl = Duration.ofMinutes(appProperties.getJwt().getAccessTtlMinutes());
        addCookie(
            response,
            ACCESS_COOKIE,
            accessToken,
            accessTtl,
            true,
            appProperties.getAuth().getAuthCookieSameSite()
        );
    }

    public void clearAuthCookies(HttpServletResponse response) {
        addCookie(response, ACCESS_COOKIE, "", Duration.ZERO, true, appProperties.getAuth().getAuthCookieSameSite());
        addCookie(response, REFRESH_COOKIE, "", Duration.ZERO, true, appProperties.getAuth().getAuthCookieSameSite());
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        return resolveCookie(request, REFRESH_COOKIE);
    }

    public String resolveAccessToken(HttpServletRequest request) {
        return resolveCookie(request, ACCESS_COOKIE);
    }

    public void setLoginNextCookie(HttpServletResponse response, String nextPath) {
        addCookie(
            response,
            LOGIN_NEXT_COOKIE,
            nextPath,
            Duration.ofMinutes(appProperties.getAuth().getLoginNextCookieTtlMinutes()),
            true,
            appProperties.getAuth().getLoginNextCookieSameSite()
        );
    }

    public String resolveLoginNext(HttpServletRequest request) {
        return resolveCookie(request, LOGIN_NEXT_COOKIE);
    }

    public void clearLoginNextCookie(HttpServletResponse response) {
        addCookie(response, LOGIN_NEXT_COOKIE, "", Duration.ZERO, true, appProperties.getAuth().getLoginNextCookieSameSite());
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
                           boolean httpOnly,
                           String sameSite) {
        ResponseCookie.ResponseCookieBuilder cookieBuilder = ResponseCookie.from(name, value)
            .path("/")
            .httpOnly(httpOnly)
            .maxAge(maxAge)
            .sameSite(normalizeSameSite(sameSite))
            .secure(appProperties.getAuth().isCookieSecure());

        String cookieDomain = appProperties.getAuth().getCookieDomain();
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookieBuilder.domain(cookieDomain.trim());
        }

        response.addHeader("Set-Cookie", cookieBuilder.build().toString());
    }

    private String normalizeSameSite(String sameSite) {
        if (sameSite == null || sameSite.isBlank()) {
            return "Lax";
        }
        if ("none".equalsIgnoreCase(sameSite)) {
            return "None";
        }
        if ("strict".equalsIgnoreCase(sameSite)) {
            return "Strict";
        }
        return "Lax";
    }
}

