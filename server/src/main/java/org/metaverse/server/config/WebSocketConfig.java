package org.metaverse.server.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;
import org.metaverse.server.core.SessionManager;

/**
 * Configures WebSocket path (default:/metaverse) and allowed origins (default:*)
 * 
 * @author joe
 * @see SessionManager
 *
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
  @Value("${org.metaverse.server.socketPath:/metaverse}")
  private String path;
  @Value("${org.metaverse.server.allowedOrigins:*}")
  private String origins;

  @Autowired
  private SessionManager sessionManager;

  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    // setAllowedOrigins or 403 forbidden when behind proxy
    registry.addHandler(sessionManager, path).setAllowedOrigins(origins)
        .addInterceptors(new HttpSessionHandshakeInterceptor());
  }
}