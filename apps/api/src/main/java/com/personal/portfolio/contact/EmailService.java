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

import java.time.format.DateTimeFormatter;
import java.time.ZoneId;

/**
 * Sends the notification email when a contact submission lands.
 *
 * <p>Resilient by design — if mail isn't configured (dev mode, no SMTP password),
 * we log the body at INFO instead of throwing. The contact endpoint will still
 * persist the submission, so leads are never lost.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final AppSettings settings;
    private final boolean mailEnabled;
    /** Absolute base URL used to build the download link in confirmation emails.
     *  Falls back to the site.baseUrl admin setting, then a localhost default. */
    private final String siteBase;

    public EmailService(
            JavaMailSender mailSender,
            AppSettings settings,
            @Value("${spring.mail.password:}") String mailPassword,
            @Value("${SITE_BASE_URL:http://localhost:3000}") String siteBase) {
        this.mailSender = mailSender;
        this.settings   = settings;
        this.mailEnabled = mailPassword != null && !mailPassword.isBlank();
        this.siteBase   = siteBase;
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

        String notifyTo = order.getEmail();
        String from     = settings.fromEmail();

        if (!mailEnabled) {
            log.info("[mail-disabled] {} → {} :: {}", subject, notifyTo, body);
            return;
        }
        SimpleMailMessage msg = new SimpleMailMessage();
        if (from != null && !from.isBlank()) msg.setFrom(from);
        msg.setTo(notifyTo);
        msg.setSubject(subject);
        msg.setText(body);
        // BCC the site owner so they get a copy without appearing in the
        // buyer's header (helpful for reconciliation + support).
        String ownerCopy = settings.notifyToEmail();
        if (ownerCopy != null && !ownerCopy.isBlank()) msg.setBcc(ownerCopy);
        try {
            mailSender.send(msg);
            log.info("Sent order confirmation to {} for order #{}", notifyTo, order.getId());
        } catch (Exception ex) {
            log.warn("Order confirmation email failed for order #{}: {}", order.getId(), ex.getMessage());
        }
    }

    public void notifyOfSubmission(ContactSubmission s) {
        // Runtime-resolved so admin can change the destination without restart.
        String notifyTo = settings.notifyToEmail();
        String from     = settings.fromEmail();
        String subject = "[shivhari.dev] New contact from " + s.getName();
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

        if (!mailEnabled || notifyTo == null || notifyTo.isBlank()) {
            log.info("[mail-disabled] {} :: {}", subject, body);
            return;
        }

        SimpleMailMessage msg = new SimpleMailMessage();
        if (from != null && !from.isBlank()) msg.setFrom(from);
        msg.setReplyTo(s.getEmail());
        msg.setTo(notifyTo);
        msg.setSubject(subject);
        msg.setText(body);
        try {
            mailSender.send(msg);
            log.info("Sent contact notification (submission #{})", s.getId());
        } catch (Exception ex) {
            log.warn("Failed to send mail for submission #{} — keeping the row in DB: {}",
                    s.getId(), ex.getMessage());
        }
    }
}
