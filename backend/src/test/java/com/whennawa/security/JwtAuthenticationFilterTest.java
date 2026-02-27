package com.whennawa.security;

import com.whennawa.entity.User;
import com.whennawa.repository.UserRepository;
import com.whennawa.service.AuthCookieService;
import com.whennawa.service.RefreshTokenService;
import com.whennawa.service.RefreshTokenService.RotationResult;
import io.jsonwebtoken.JwtException;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }
    
    // JWT ?�큰 만료 ???�터기반 ??발급 ?�스??    @Test
    void expiredAccessToken_triggersRefreshAndSetsNewTokens() throws Exception {
        JwtService jwtService = mock(JwtService.class);
        UserRepository userRepository = mock(UserRepository.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
        AuthCookieService authCookieService = mock(AuthCookieService.class);

        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
            jwtService,
            userRepository,
            refreshTokenService,
            authCookieService);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/secure");
        request.addHeader("Authorization", "Bearer expired-access");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        User user = userWithId("user@example.com", 42L);
        when(jwtService.parseToken("expired-access"))
            .thenThrow(new JwtException("expired"));
        when(authCookieService.resolveRefreshToken(request)).thenReturn("refresh");
        when(refreshTokenService.rotateToken("refresh"))
            .thenReturn(new RotationResult(user, "new-refresh", LocalDateTime.now().plusDays(1)));
        when(jwtService.createAccessToken(user)).thenReturn("new-access");

        filter.doFilter(request, response, chain);

        verify(authCookieService).setAuthCookies(response, "new-access", "new-refresh");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authentication).isNotNull();
        assertThat(authentication.getPrincipal()).isInstanceOf(UserPrincipal.class);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        assertThat(principal.getUserId()).isEqualTo(42L);
    }

    private User userWithId(String email, Long id) {
        User user = new User(email);
        try {
            Field field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Failed to set user id for test", ex);
        }
        return user;
    }
}

