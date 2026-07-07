package com.personal.portfolio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

import java.util.Arrays;

/**
 * Stateless JSON API security.
 *
 * <p>/api/** is publicly readable at the HTTP layer; admin-only routes are gated
 * downstream by AdminAuthFilter (session-token based). Contact endpoint is
 * rate-limited (see RateLimitFilter).
 *
 * <p>The H2 console (/h2/**) is only exposed when the "dev" or "local" Spring
 * profile is active — never in prod. Leaving the console reachable in prod
 * would let anyone browse the database via a browser.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final boolean h2ConsoleEnabled;

    public SecurityConfig(Environment env,
                          @Value("${spring.h2.console.enabled:false}") boolean h2Prop) {
        boolean isDevProfile = Arrays.stream(env.getActiveProfiles())
                .anyMatch(p -> p.equalsIgnoreCase("dev") || p.equalsIgnoreCase("local"));
        this.h2ConsoleEnabled = isDevProfile && h2Prop;
    }

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> {
                csrf.disable();                       // pure JSON API — no CSRF surface
            })
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(reg -> {
                reg.requestMatchers("/api/**", "/actuator/health", "/actuator/info", "/error")
                   .permitAll();
                if (h2ConsoleEnabled) {
                    reg.requestMatchers(new AntPathRequestMatcher("/h2/**")).permitAll();
                }
                reg.anyRequest().permitAll();
            })
            .headers(h -> h.frameOptions(f -> {
                if (h2ConsoleEnabled) f.sameOrigin();  // allow /h2 console in dev
                else f.deny();                          // deny framing in prod
            }));
        return http.build();
    }
}
