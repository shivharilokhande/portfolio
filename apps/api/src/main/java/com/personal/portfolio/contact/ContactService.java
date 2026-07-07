package com.personal.portfolio.contact;

import com.personal.portfolio.config.AppSettings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;

/**
 * Use-case orchestrator for contact submissions.
 *
 *   1. Persist the submission (always succeeds — leads aren't lost)
 *   2. Quick spam heuristics (very simple v1; can grow)
 *   3. Fire-and-forget email notification
 */
@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);

    private final ContactRepository repo;
    private final EmailService email;
    private final AppSettings settings;
    private final String ipSalt;

    public ContactService(ContactRepository repo, EmailService email,
                          AppSettings settings, Environment env,
                          @Value("${app.contact.ip-salt:portfolio-salt}") String ipSalt) {
        this.repo     = repo;
        this.email    = email;
        this.settings = settings;
        // Fail-fast in prod when running with the default salt — an
        // attacker with a DB dump could rainbow-table IPv4 space in
        // seconds against the source-visible default.
        boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");
        if (isProd && "portfolio-salt".equals(ipSalt)) {
            throw new IllegalStateException(
                    "SECURITY: refusing to start with default contact ip-salt in prod. " +
                    "Set the APP_CONTACT_IP_SALT env var to a strong random string.");
        }
        this.ipSalt = ipSalt;
    }

    @Transactional
    public ContactSubmission submit(ContactRequest req, String ip, String userAgent) {
        // Honeypot: if the hidden field carries any content, treat the
        // submission as bot spam. Feature-flagged via AppSettings so admins
        // can turn it off if it starts flagging legitimate assistive-tech
        // users (rare but possible).
        boolean honeypotTripped = settings.contactHoneypot()
                && req.hp() != null && !req.hp().isBlank();

        ContactSubmission s = new ContactSubmission();
        s.setName(req.name().trim());
        s.setEmail(req.email().trim().toLowerCase());
        s.setCompany(blankToNull(req.company()));
        s.setProjectType(blankToNull(req.projectType()));
        s.setMessage(req.message().trim());
        s.setIpHash(hashIp(ip));
        s.setUserAgent(truncate(userAgent, 512));

        if (honeypotTripped || looksLikeSpam(s)) {
            s.setStatus(ContactSubmission.Status.SPAM);
        }

        ContactSubmission saved = repo.save(s);
        log.info("Saved contact submission #{} from {} ({})", saved.getId(), saved.getEmail(), saved.getStatus());

        if (saved.getStatus() != ContactSubmission.Status.SPAM) {
            email.notifyOfSubmission(saved);
        }
        return saved;
    }

    /**
     * Very light spam heuristics. If this gets noisy we can plug in
     * Akismet or hCaptcha here.
     */
    private boolean looksLikeSpam(ContactSubmission s) {
        String msg = s.getMessage().toLowerCase();
        // 1. Many submissions from the same email recently
        Instant since = Instant.now().minus(Duration.ofHours(1));
        if (repo.countByEmailAndCreatedAtAfter(s.getEmail(), since) >= 3) return true;
        // 2. Obvious spam phrases
        return msg.contains("seo services") || msg.contains("backlink") || msg.contains("crypto investment");
    }

    private static String blankToNull(String v) {
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private static String truncate(String v, int max) {
        if (v == null) return null;
        return v.length() <= max ? v : v.substring(0, max);
    }

    /** SHA-256 of "salt:ip" so we can detect repeat senders without storing the raw IP. */
    private String hashIp(String ip) {
        if (ip == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest((ipSalt + ":" + ip).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(dig).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }
}
