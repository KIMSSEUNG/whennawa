package com.whennawa.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            String uri = request.getRequestURI();
            String query = request.getQueryString();

            String fullPath = query == null ? uri : uri + "?" + query;
            String cookieHeader = request.getHeader("Cookie");
            String authHeader = request.getHeader("Authorization");
            log.debug(
                "API {} {} -> {} ({} ms) Cookie={} Authorization={}",
                request.getMethod(),
                fullPath,
                response.getStatus(),
                duration,
                cookieHeader,
                authHeader
            );
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/auth");
    }
}
