package com.personal.portfolio.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight in-memory admin auth.
 *
 *  - Static credentials read from app.admin.email / app.admin.password.
 *  - login() returns an opaque session token (Base64URL, 32 bytes) valid
 *    for 8 hours. Tokens are kept in a ConcurrentHashMap — fine for
 *    single-instance deploys. Swap for Redis when scaling out.
 *  - validate() returns true if the token is known + not expired.
 */
@Component
public class AdminAuth {

    private static final Logger log = LoggerFactory.getLogger(AdminAuth.class);
    private static final Duration TTL = Duration.ofHours(8);
    private static final SecureRandom RNG = new SecureRandom();

    private final String email;
    private final String password;
    private final Map<String, Instant> sessions = new ConcurrentHashMap<>();

    public AdminAuth(
            @Value("${app.admin.email:shivlokhande7080@gmail.com}") String email,
            @Value("${app.admin.password:123456}")                   String password,
            Environment env) {
        this.email    = email;
        this.password = password;
        // Weak-password guard rail. These are literal values a template
        // buyer might leave in place; either would be catastrophic in prod.
        boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");
        java.util.Set<String> weakDefaults = java.util.Set.of(
                "changeme", "123456", "password", "admin", "admin123");
        if (password == null || weakDefaults.contains(password)) {
            if (isProd) {
                throw new IllegalStateException(
                    "SECURITY: refusing to start with weak default admin password '" + password + "' in prod. " +
                    "Set the APP_ADMIN_PASSWORD env var to a strong secret before deploying.");
            }
            log.warn("\n\n*** ADMIN PASSWORD IS A WEAK DEFAULT ('{}') — set APP_ADMIN_PASSWORD env var before deploying to prod. ***\n", password);
        }
    }

    public String login(String emailIn, String passwordIn) {
        if (emailIn == null || passwordIn == null) return null;
        // Constant-time compares for BOTH fields. `&` (not `&&`) so the
        // password compare runs even when the email is wrong — otherwise the
        // short-circuit leaks whether the email guess landed. Both sides
        // lowercase the email through UTF-8 bytes so we don't fall back to a
        // fast `equalsIgnoreCase` timing.
        byte[] expectedEmail = email.toLowerCase(java.util.Locale.ROOT)
                .getBytes(StandardCharsets.UTF_8);
        byte[] givenEmail    = emailIn.trim().toLowerCase(java.util.Locale.ROOT)
                .getBytes(StandardCharsets.UTF_8);
        boolean emailOk = MessageDigest.isEqual(expectedEmail, givenEmail);
        boolean pwOk    = MessageDigest.isEqual(
                password.getBytes(StandardCharsets.UTF_8),
                passwordIn.getBytes(StandardCharsets.UTF_8));
        if (!(emailOk & pwOk)) return null;

        byte[] bytes = new byte[32];
        RNG.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        // Single-admin model — a successful login invalidates any older
        // sessions this same admin already held. Prevents a phished-then-
        // rotated token from lingering alongside the current one.
        sessions.clear();
        sessions.put(token, Instant.now().plus(TTL));
        return token;
    }

    /**
     * Sweep expired tokens. Called opportunistically (1-in-256 chance) from
     * validate() so the sessions map can't grow unbounded even if the admin
     * never explicitly logs in / out.
     */
    void sweepExpired() {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(e -> e.getValue().isBefore(now));
    }

    public boolean validate(String token) {
        if (token == null || token.isBlank()) return false;
        Instant exp = sessions.get(token);
        if (exp == null) return false;
        Instant now = Instant.now();
        if (now.isAfter(exp)) {
            sessions.remove(token);
            return false;
        }
        // Cheap opportunistic sweep — piggy-back on a validate() call once
        // every ~256 requests to keep the map from growing unbounded when
        // no explicit login rotations happen.
        if ((RNG.nextInt() & 0xFF) == 0) sweepExpired();
        return true;
    }

    public void logout(String token) {
        if (token != null) sessions.remove(token);
    }

    public String adminEmail() { return email; }
}
