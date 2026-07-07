package com.personal.portfolio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Allow the React app (and any deploy URLs we list) to call the API.
 * Origins come from app.cors.allowed-origins (comma-separated env var ALLOWED_ORIGINS).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("${app.cors.allowed-origins}") String allowed) {
        this.allowedOrigins = List.of(allowed.split("\\s*,\\s*"));
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("X-Rate-Limit-Remaining", "X-Rate-Limit-Reset")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
