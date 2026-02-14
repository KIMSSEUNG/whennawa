package com.whennawa.config;

import com.whennawa.repository.UserRepository;
import com.whennawa.security.JwtAuthenticationFilter;
import com.whennawa.security.JwtService;
import com.whennawa.security.RequestLoggingFilter;
import com.whennawa.service.AuthCookieService;
import com.whennawa.service.OAuthAccountService;
import com.whennawa.service.RefreshTokenService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.context.NullSecurityContextRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${spring.security.oauth2.client.redirectUrl}")
    private String redirectURL;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   AuthenticationSuccessHandler successHandler,
                                                   AuthenticationFailureHandler failureHandler,
                                                   OAuth2AuthorizationRequestResolver authorizationRequestResolver,
                                                   JwtAuthenticationFilter jwtAuthenticationFilter,
                                                   RequestLoggingFilter requestLoggingFilter) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .exceptionHandling(ex -> ex
                    .defaultAuthenticationEntryPointFor(
                            (req, res, e) -> res.sendError(401),
                            new AntPathRequestMatcher("/auth/api/**")
                    )
            )
            .csrf(csrf -> csrf.ignoringRequestMatchers("/auth/api/**", "/api/**", "/webhooks/**", "/h2-console/**"))
            .securityContext(sc -> sc.securityContextRepository(new NullSecurityContextRepository()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/h2-console/**", "/webhooks/**", "/oauth2/**", "/login/**",
                    "/auth/login/**",
                    "/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/**").permitAll()
                .requestMatchers("/auth/api/**").authenticated()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(authorization -> authorization
                    .authorizationRequestResolver(authorizationRequestResolver))
                .successHandler(successHandler)
                .failureHandler(failureHandler)
            )
            .logout(logout -> logout
                .logoutSuccessUrl(redirectURL)
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            )
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .addFilterBefore(requestLoggingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);


        return http.build();
    }

    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler(
            OAuth2AuthorizedClientService clientService,
            OAuthAccountService accountService,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            AuthCookieService authCookieService) {
        return new OAuth2SuccessHandler(clientService, accountService, jwtService, refreshTokenService, authCookieService);
    }

    @Bean
    public AuthenticationFailureHandler authenticationFailureHandler(AuthCookieService authCookieService) {
        return new OAuth2FailureHandler(authCookieService);
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService,
                                                           UserRepository userRepository,
                                                           RefreshTokenService refreshTokenService,
                                                           AuthCookieService authCookieService) {
        return new JwtAuthenticationFilter(jwtService, userRepository, refreshTokenService, authCookieService);
    }

    @Bean
    public RequestLoggingFilter requestLoggingFilter() {
        return new RequestLoggingFilter();
    }

    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository) {

        DefaultOAuth2AuthorizationRequestResolver delegate =
                new DefaultOAuth2AuthorizationRequestResolver(
                        clientRegistrationRepository, "/oauth2/authorization"
                );

        return new OAuth2AuthorizationRequestResolver() {
            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                return customizeAuthorizationRequest(request, delegate.resolve(request));
            }

            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
                return customizeAuthorizationRequest(request, delegate.resolve(request, clientRegistrationId));
            }
        };
    }

    private OAuth2AuthorizationRequest customizeAuthorizationRequest(
            HttpServletRequest httpRequest,
            OAuth2AuthorizationRequest request) {

        if (request == null) return null;

        Map<String, Object> additionalParameters =
                new LinkedHashMap<>(request.getAdditionalParameters());

        additionalParameters.put("access_type", "offline");

        // force_consent=1???뚮쭔 媛뺤젣 ?щ룞??
        if ("1".equals(httpRequest.getParameter("force_consent"))) {
            additionalParameters.put("prompt", "consent");
        }

        return OAuth2AuthorizationRequest.from(request)
                .additionalParameters(additionalParameters)
                .build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(redirectURL));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}






