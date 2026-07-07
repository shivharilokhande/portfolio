package com.personal.portfolio.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.personal.portfolio.config.AppSettings;
import com.razorpay.Utils;
import com.razorpay.RazorpayException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

/**
 * Inbound payment webhooks. Both endpoints verify the gateway's signature
 * against the shared secret before touching any order — an attacker who
 * knows the URL but not the secret gets a 401 and no state change.
 *
 * <p>Idempotency lives in {@link OrderService#markPaidByPaymentRef}. Both
 * Razorpay and Stripe retry webhooks aggressively (up to hours after the
 * first delivery), so treating repeat events as a noop is critical.
 *
 * <p>Wire the endpoints in the gateway dashboards:
 *   Razorpay → Settings → Webhooks → Add
 *              URL:    https://your-domain/api/store/webhooks/razorpay
 *              Events: payment.captured
 *              Secret: same string you saved in
 *                      /admin/settings → Razorpay webhook secret
 *   Stripe   → Developers → Webhooks → Add endpoint
 *              URL:    https://your-domain/api/store/webhooks/stripe
 *              Events: checkout.session.completed
 *              Secret: whsec_… printed on the endpoint page →
 *                      /admin/settings → Stripe webhook secret
 */
@RestController
public class PaymentWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

    private final OrderService orders;
    private final AppSettings settings;
    private final ObjectMapper mapper;

    public PaymentWebhookController(OrderService orders, AppSettings settings, ObjectMapper mapper) {
        this.orders   = orders;
        this.settings = settings;
        this.mapper   = mapper;
    }

    /* -------------------- Razorpay -------------------- */

    @PostMapping(path = "/api/store/webhooks/razorpay", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> razorpay(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            HttpServletRequest req) {

        String secret = settings.rawValue("payment.razorpay.webhookSecret").orElse(null);
        if (secret == null || secret.isBlank()) {
            log.warn("Razorpay webhook received but no webhook secret configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "webhook_not_configured"));
        }
        if (signature == null || signature.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "missing_signature"));
        }

        try {
            boolean valid = Utils.verifyWebhookSignature(payload, signature, secret);
            if (!valid) {
                log.warn("Razorpay webhook signature verification FAILED from {}", req.getRemoteAddr());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "invalid_signature"));
            }
        } catch (RazorpayException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "verification_failed"));
        }

        try {
            JsonNode root = mapper.readTree(payload);
            String eventType = root.path("event").asText("");
            if (!"payment.captured".equals(eventType) && !"order.paid".equals(eventType)) {
                // Not the event we care about — 200 so Razorpay stops retrying.
                return ResponseEntity.ok(Map.of("received", true, "handled", false));
            }
            // Razorpay wraps the order id in payload.payment.entity.order_id.
            String razorpayOrderId = root
                    .path("payload").path("payment").path("entity").path("order_id")
                    .asText("");
            if (razorpayOrderId.isBlank()) {
                razorpayOrderId = root.path("payload").path("order").path("entity").path("id").asText("");
            }
            Optional<Order> paid = orders.markPaidByPaymentRef(razorpayOrderId);
            return ResponseEntity.ok(Map.of(
                    "received", true,
                    "handled",  paid.isPresent(),
                    "orderId",  paid.map(Order::getId).orElse(null)));
        } catch (Exception e) {
            log.error("Razorpay webhook processing failed: {}", e.getMessage(), e);
            // Return 200 to prevent infinite retries once we've verified the
            // signature — the log is the record; we don't want retry storms.
            return ResponseEntity.ok(Map.of("received", true, "handled", false));
        }
    }

    /* -------------------- Stripe -------------------- */

    @PostMapping(path = "/api/store/webhooks/stripe", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> stripe(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature,
            HttpServletRequest req) {

        String secret = settings.stripeWebhookSecret();
        if (secret == null || secret.isBlank()) {
            log.warn("Stripe webhook received but no webhook secret configured");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "webhook_not_configured"));
        }
        if (signature == null || signature.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "missing_signature"));
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, secret);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification FAILED from {}: {}",
                    req.getRemoteAddr(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "invalid_signature"));
        }

        if (!"checkout.session.completed".equals(event.getType())) {
            // We only care about the terminal event. 200 so Stripe stops retrying.
            return ResponseEntity.ok(Map.of("received", true, "handled", false));
        }

        EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
        Optional<StripeObject> so = deserializer.getObject();
        if (so.isEmpty() || !(so.get() instanceof Session session)) {
            log.warn("Stripe event {} could not be deserialized to Session", event.getId());
            return ResponseEntity.ok(Map.of("received", true, "handled", false));
        }

        Optional<Order> paid = orders.markPaidByPaymentRef(session.getId());
        return ResponseEntity.ok(Map.of(
                "received", true,
                "handled",  paid.isPresent(),
                "orderId",  paid.map(Order::getId).orElse(null)));
    }
}
