package com.whennawa.config;

import com.whennawa.entity.User;
import com.whennawa.security.JwtService;
import com.whennawa.service.AuthCookieService;
import com.whennawa.service.OAuthAccountService;
import com.whennawa.service.RefreshTokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final OAuth2AuthorizedClientService clientService;
    private final OAuthAccountService accountService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuthCookieService authCookieService;

    @Value("${spring.security.oauth2.client.redirectUrl}")
    private String redirectURL;

    public OAuth2SuccessHandler(OAuth2AuthorizedClientService clientService,
                                OAuthAccountService accountService,
                                JwtService jwtService,
                                RefreshTokenService refreshTokenService,
                                AuthCookieService authCookieService) {
        this.clientService = clientService;
        this.accountService = accountService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.authCookieService = authCookieService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2AuthorizedClient client = clientService.loadAuthorizedClient(
                token.getAuthorizedClientRegistrationId(),
                token.getName()
        );

        OAuthAccountService.OAuthAccountResult result = accountService.handleOAuthSuccess(client);
        User user = result.getUser();
        String nextPath = sanitizeNext(authCookieService.resolveLoginNext(request));
        authCookieService.clearLoginNextCookie(response);
        if (user == null) {
            response.sendRedirect(buildRedirect(nextPath));
            return;
        }
        String accessToken = jwtService.createAccessToken(user);
        RefreshTokenService.IssuedToken refreshToken = refreshTokenService.issueToken(user);
        authCookieService.setAuthCookies(response, accessToken, refreshToken.token());
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        ResponseCookie jsession = ResponseCookie.from("JSESSIONID", "")
            .path("/")
            .maxAge(Duration.ZERO)
            .build();
        response.addHeader("Set-Cookie", jsession.toString());

        if (user.getRole() != null && "ADMIN".equals(user.getRole().name())) {
            response.sendRedirect(buildRedirect("/admin"));
        }
        else{
            response.sendRedirect(buildRedirect(sanitizeNextForUser(nextPath)));
        }

    }

    private String sanitizeNext(String nextPath) {
        if (nextPath == null || nextPath.isBlank()) {
            return "/";
        }
        String trimmed = nextPath.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
            return "/";
        }
        return trimmed;
    }

    private String sanitizeNextForUser(String nextPath) {
        if (nextPath == null || nextPath.isBlank()) {
            return "/";
        }
        String lower = nextPath.toLowerCase();
        if (lower.startsWith("/admin") || lower.startsWith("/api/admin")) {
            return "/";
        }
        return nextPath;
    }

    private String buildRedirect(String nextPath) {
        if (redirectURL.endsWith("/") && nextPath.startsWith("/")) {
            return redirectURL + nextPath.substring(1);
        }
        return redirectURL + nextPath;
    }
}

