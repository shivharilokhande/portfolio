package com.personal.portfolio.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.lang.NonNull;

import java.io.IOException;
import java.time.Duration;

/**
 * Token-bucket rate limiter per remote IP. Cheap, in-memory, good enough for
 * a single-instance deployment. Two policies:
 *
 *   - POST /api/contact → app.rate-limit.contact-per-hour per hour
 *   - other GETs         → app.rate-limit.api-per-minute per minute
 *
 * When breached, returns 429 with a JSON body. Adds X-Rate-Limit-Remaining /
 * X-Rate-Limit-Reset headers on every /api response.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private final AppSettings settings;
    private final ClientIpResolver ipResolver;

    // Per-IP buckets. Bounded and TTL'd so a botnet with millions of unique
    // IPs can't exhaust heap — inactive IPs age out after 2 hours.
    private final com.github.benmanes.caffeine.cache.Cache<String, Bucket> contactBuckets =
            com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                    .maximumSize(50_000)
                    .expireAfterAccess(java.time.Duration.ofHours(2))
                    .build();
    private final com.github.benmanes.caffeine.cache.Cache<String, Bucket> apiBuckets =
            com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                    .maximumSize(100_000)
                    .expireAfterAccess(java.time.Duration.ofMinutes(15))
                    .build();
    /** Admin login has its own tight bucket (5 attempts / minute / IP) to slow brute-force. */
    private final com.github.benmanes.caffeine.cache.Cache<String, Bucket> loginBuckets =
            com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
                    .maximumSize(10_000)
                    .expireAfterAccess(java.time.Duration.ofMinutes(15))
                    .build();

    public RateLimitFilter(AppSettings settings, ClientIpResolver ipResolver) {
        this.settings   = settings;
        this.ipResolver = ipResolver;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String path = req.getRequestURI();
        if (!path.startsWith("/api/")) { chain.doFilter(req, res); return; }

        String ip = ipResolver.resolve(req);

        // Admin login is the ONE pre-auth admin route — cap it tightly to slow brute force.
        boolean isLogin = "POST".equalsIgnoreCase(req.getMethod()) && path.equals("/api/admin/login");

        // Other /api/admin/* routes are token-authenticated by AdminAuthFilter; one admin
        // user can legitimately fire many requests (dashboard loads 5 parallel fetches
        // on mount). Skip the IP bucket for them.
        if (path.startsWith("/api/admin/") && !isLogin) { chain.doFilter(req, res); return; }

        boolean isContact = "POST".equalsIgnoreCase(req.getMethod()) && path.equals("/api/contact");

        // Caps come from AppSettings (admin-editable) — but the buckets are
        // cached per-IP forever. Changing a cap from the admin panel only
        // affects buckets created after the change; existing IPs keep their
        // old refill schedule until the process restarts or the bucket
        // is evicted. For the small caps we run this is acceptable; if you
        // need instant effect on every IP, clear the maps on change.
        int loginCap   = settings.loginPerMinute();
        int contactCap = settings.contactPerHour();
        int apiCap     = settings.apiPerMinute();

        Bucket bucket;
        if (isLogin) {
            bucket = loginBuckets.get(ip, k -> Bucket.builder()
                    .addLimit(Bandwidth.classic(loginCap,
                            Refill.intervally(loginCap, Duration.ofMinutes(1))))
                    .build());
        } else if (isContact) {
            bucket = contactBuckets.get(ip, k -> Bucket.builder()
                    .addLimit(Bandwidth.classic(contactCap,
                            Refill.intervally(contactCap, Duration.ofHours(1))))
                    .build());
        } else {
            bucket = apiBuckets.get(ip, k -> Bucket.builder()
                    .addLimit(Bandwidth.classic(apiCap,
                            Refill.intervally(apiCap, Duration.ofMinutes(1))))
                    .build());
        }

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        res.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
        res.setHeader("X-Rate-Limit-Reset",
                String.valueOf(probe.getNanosToWaitForRefill() / 1_000_000_000L));

        if (probe.isConsumed()) {
            chain.doFilter(req, res);
        } else {
            res.setStatus(429); // 429 Too Many Requests — not exposed as a constant on Jakarta HttpServletResponse
            res.setContentType("application/json");
            res.getWriter().write("""
                {"error":"rate_limit_exceeded","message":"Too many requests. Please try again later."}""");
        }
    }

}
