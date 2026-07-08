package com.personal.portfolio.contact;

import com.personal.portfolio.config.AppSettings;
import com.personal.portfolio.store.Order;
import com.personal.portfolio.store.OrderItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.List;

/**
 * Sends the notification email when a contact submission lands OR when a
 * store order transitions to PAID.
 *
 * <p>Delivery path is chosen at construction time based on env vars:
 *
 * <ol>
 *   <li>If {@code BREVO_API_KEY} is set → send via Brevo's transactional
 *       HTTPS API (POST https://api.brevo.com/v3/smtp/email). This is the
 *       only path that works on hosts that block outbound SMTP — notably
 *       Render Free and most PaaS providers.</li>
 *   <li>Else if {@code MAIL_PASSWORD} is set → send via SMTP through
 *       Spring's JavaMailSender. Works on hosts that allow outbound
 *       SMTP (Render Starter+, most VPSes).</li>
 *   <li>Else → log the body at INFO and return. The contact endpoint
 *       still persists the submission, so leads are never lost.</li>
 * </ol>
 *
 * <p>All send failures are caught and logged at WARN — this class never
 * throws back to the caller, so an email outage never blocks the
 * request path.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    private final JavaMailSender mailSender;
    private final AppSettings settings;
    private final boolean smtpEnabled;
    private final String brevoApiKey;
    private final boolean brevoEnabled;
    private final HttpClient http;
    /** Absolute base URL used to build the download link in confirmation emails.
     *  Falls back to the site.baseUrl admin setting, then a localhost default. */
    private final String siteBase;

    public EmailService(
            JavaMailSender mailSender,
            AppSettings settings,
            @Value("${spring.mail.password:}") String mailPassword,
            @Value("${BREVO_API_KEY:}") String brevoApiKey,
            @Value("${SITE_BASE_URL:http://localhost:3000}") String siteBase) {
        this.mailSender   = mailSender;
        this.settings     = settings;
        this.smtpEnabled  = mailPassword != null && !mailPassword.isBlank();
        this.brevoApiKey  = brevoApiKey != null ? brevoApiKey.trim() : "";
        this.brevoEnabled = !this.brevoApiKey.isEmpty();
        this.siteBase     = siteBase;
        // Reasonable timeouts — Brevo API responds in ~200ms typically, but
        // give it 10s headroom. Container startup on Render Free is slow and
        // we don't want the first request to bleed into cold-start territory.
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        if (brevoEnabled) {
            log.info("EmailService: using Brevo HTTP API");
        } else if (smtpEnabled) {
            log.info("EmailService: using SMTP (JavaMailSender)");
        } else {
            log.info("EmailService: no email provider configured — sends will be logged only");
        }
    }

    /** Prefer the admin-editable site.baseUrl over the env default. */
    private String baseUrl() {
        String cfg = settings.siteBaseUrl();
        return (cfg != null && !cfg.isBlank()) ? cfg.trim() : siteBase;
    }

    /**
     * Order confirmation to the buyer with a working download link. Fired
     * exactly once per order transition PENDING → PAID (both mock-confirm
     * and gateway-webhook paths funnel through here via
     * {@code OrderService.markPaidAndNotify}).
     */
    public void notifyOfPaidOrder(Order order) {
        if (order.getEmail() == null || order.getEmail().isBlank()) {
            log.warn("Order #{} has no email — skipping confirmation mail", order.getId());
            return;
        }
        String downloadUrl = baseUrl().replaceAll("/+$", "")
                + "/store/downloads/" + order.getDownloadToken();
        String expiry = order.getExpiresAt() == null
                ? "unspecified"
                : DateTimeFormatter.ofPattern("d MMM yyyy")
                        .withZone(ZoneId.systemDefault())
                        .format(order.getExpiresAt());

        StringBuilder items = new StringBuilder();
        for (OrderItem it : order.getItems()) {
            items.append("  • ").append(it.getProductTitle())
                    .append(" × ").append(it.getQuantity()).append('\n');
        }

        String subject = "Your download link · Order #" + order.getId();
        String body = """
                Hi %s,

                Thanks for your purchase. Your downloads are ready.

                Order #%d — %s %s
                %s
                Download link (bookmark it):
                %s

                The link stays valid until %s. If you need to redownload after
                that, reply to this email and we'll re-issue.

                — %s
                """.formatted(
                order.getName(),
                order.getId(),
                order.getCurrency(),
                order.getTotal().toPlainString(),
                items.toString(),
                downloadUrl,
                expiry,
                settings.siteTitle());

        String from    = settings.fromEmail();
        // No BCC to the seller — customers were seeing the seller's personal
        // address in their Gmail headers, which looked amateurish and
        // exposed a working reply-to route. Sellers get order confirmations
        // via /admin/orders (auto-refresh 30s) instead.
        Msg msg = new Msg(from, order.getEmail(), subject, body, null, List.of(), settings.siteTitle());
        boolean ok = dispatch(msg);
        if (ok) {
            log.info("Sent order confirmation to {} for order #{}", order.getEmail(), order.getId());
        } else {
            log.warn("Order confirmation email failed for order #{} — DB row still marked PAID", order.getId());
        }
    }

    public void notifyOfSubmission(ContactSubmission s) {
        // Runtime-resolved so admin can change the destination without restart.
        String notifyTo = settings.notifyToEmail();
        String from     = settings.fromEmail();
        String subject = "[" + settings.siteTitle() + "] New contact from " + s.getName();
        String body = """
                You received a new contact-form submission.

                Name:          %s
                Email:         %s
                Company:       %s
                Project type:  %s

                Message:
                %s

                ---
                Reply within 24h. Submission #%d.
                """.formatted(
                s.getName(),
                s.getEmail(),
                s.getCompany() == null ? "—" : s.getCompany(),
                s.getProjectType() == null ? "—" : s.getProjectType(),
                s.getMessage(),
                s.getId() == null ? -1 : s.getId());

        if (notifyTo == null || notifyTo.isBlank()) {
            log.info("[mail-no-destination] {} :: {}", subject, body);
            return;
        }

        Msg msg = new Msg(from, notifyTo, subject, body, s.getEmail(), List.of(), settings.siteTitle());
        boolean ok = dispatch(msg);
        if (ok) {
            log.info("Sent contact notification (submission #{})", s.getId());
        } else {
            log.warn("Failed to send mail for submission #{} — keeping the row in DB", s.getId());
        }
    }

    /** Route a message through the first available provider. Never throws. */
    private boolean dispatch(Msg m) {
        if (brevoEnabled) {
            return sendViaBrevo(m);
        }
        if (smtpEnabled) {
            return sendViaSmtp(m);
        }
        // No provider — log the body so leads are visible in server logs.
        log.info("[mail-disabled] {} → {} :: {}", m.subject, m.to, m.text);
        return false;
    }

    /**
     * POSTs to https://api.brevo.com/v3/smtp/email with a hand-rolled JSON
     * body. We keep dependencies minimal (no Jackson call needed — the JSON
     * shape is small and stable). Escapes strings for JSON safety.
     */
    private boolean sendViaBrevo(Msg m) {
        // Sender: use configured from-address; if it's blank, fall back to a
        // hard-coded no-reply. The address MUST be verified in Brevo or the
        // API returns 400 with "unverified sender".
        String senderEmail = (m.from != null && !m.from.isBlank()) ? m.from : "no-reply@example.com";
        String senderName  = m.senderName != null ? m.senderName : "shivhari.tech";

        StringBuilder bccJson = new StringBuilder();
        for (int i = 0; i < m.bcc.size(); i++) {
            if (i > 0) bccJson.append(",");
            bccJson.append("{\"email\":\"").append(esc(m.bcc.get(i))).append("\"}");
        }
        String replyToJson = (m.replyTo != null && !m.replyTo.isBlank())
                ? ",\"replyTo\":{\"email\":\"" + esc(m.replyTo) + "\"}"
                : "";
        String bccBlock = !m.bcc.isEmpty()
                ? ",\"bcc\":[" + bccJson + "]"
                : "";

        String json = "{"
                + "\"sender\":{\"email\":\"" + esc(senderEmail) + "\",\"name\":\"" + esc(senderName) + "\"},"
                + "\"to\":[{\"email\":\"" + esc(m.to) + "\"}],"
                + "\"subject\":\"" + esc(m.subject) + "\","
                + "\"textContent\":\"" + esc(m.text) + "\""
                + replyToJson
                + bccBlock
                + "}";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("api-key", brevoApiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            if (code >= 200 && code < 300) {
                return true;
            }
            // Brevo returns JSON like {"code":"unauthorized","message":"Key not found"}.
            // Log the response body so we can debug quickly.
            log.warn("Brevo API returned {}: {}", code, response.body());
            return false;
        } catch (Exception ex) {
            log.warn("Brevo API call failed: {}", ex.getMessage());
            return false;
        }
    }

    /** Legacy SMTP path. Kept for hosts that allow outbound SMTP. */
    private boolean sendViaSmtp(Msg m) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            if (m.from != null && !m.from.isBlank()) msg.setFrom(m.from);
            if (m.replyTo != null && !m.replyTo.isBlank()) msg.setReplyTo(m.replyTo);
            msg.setTo(m.to);
            msg.setSubject(m.subject);
            msg.setText(m.text);
            if (!m.bcc.isEmpty()) msg.setBcc(m.bcc.toArray(new String[0]));
            mailSender.send(msg);
            return true;
        } catch (Exception ex) {
            log.warn("SMTP send failed: {}", ex.getMessage());
            return false;
        }
    }

    /** Minimal JSON string escaper — handles quotes, backslashes, newlines. */
    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder out = new StringBuilder(s.length() + 8);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"'  -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default   -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }

    /** Internal message DTO — captures both providers' needs. */
    private record Msg(
            String from,
            String to,
            String subject,
            String text,
            String replyTo,
            List<String> bcc,
            String senderName) {}
}
