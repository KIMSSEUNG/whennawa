package com.whennawa.config;

import com.whennawa.security.UserPrincipal;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

public class WebSocketAuthHandshakeInterceptor implements HandshakeInterceptor {
    public static final String USER_ID_ATTR = "wsUserId";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return true;
        }
        Object principal = servletRequest.getServletRequest().getUserPrincipal();
        if (principal instanceof Authentication authentication
            && authentication.getPrincipal() instanceof UserPrincipal userPrincipal) {
            attributes.put(USER_ID_ATTR, userPrincipal.getUserId());
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // No-op
    }
}
