package com.personal.portfolio.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Central helper for deriving the "real" client IP from an incoming request.
 *
 * <p>By default returns {@link HttpServletRequest#getRemoteAddr()}. Only when
 * this instance is explicitly running behind a trusted reverse proxy — see
 * {@code app.rate-limit.trust-forwarded-for} and
 * {@code app.rate-limit.trusted-proxies} — do we honour the first hop from
 * the {@code X-Forwarded-For} header. This prevents arbitrary clients from
 * spoofing their identity and evading per-IP controls.
 *
 * <p>Shared by {@link RateLimitFilter} and {@code ContactController} so the
 * spam heuristic anchor + rate limit both look at the same IP.
 */
@Component
public class ClientIpResolver {

    private final boolean trustForwardedFor;
    private final Set<String> trustedProxies;

    public ClientIpResolver(
            @Value("${app.rate-limit.trust-forwarded-for:false}") boolean trustForwardedFor,
            @Value("${app.rate-limit.trusted-proxies:}") String trustedProxiesCsv) {
        this.trustForwardedFor = trustForwardedFor;
        this.trustedProxies    = (trustedProxiesCsv == null || trustedProxiesCsv.isBlank())
                ? Set.of()
                : Set.of(trustedProxiesCsv.split("\\s*,\\s*"));
    }

    public String resolve(HttpServletRequest req) {
        String socket = req.getRemoteAddr();
        if (!trustForwardedFor) return socket;
        if (!trustedProxies.isEmpty() && !trustedProxies.contains(socket)) return socket;
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd == null || fwd.isBlank()) return socket;
        return fwd.split(",")[0].trim();
    }
}
