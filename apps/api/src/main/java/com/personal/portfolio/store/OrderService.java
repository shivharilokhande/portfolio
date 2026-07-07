package com.personal.portfolio.store;

import com.personal.portfolio.contact.EmailService;
import com.personal.portfolio.store.payment.PaymentProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final ProductRepository products;
    private final OrderRepository   orders;
    private final Map<String, PaymentProvider> providers;
    private final EmailService email;
    private final long downloadWindowDays = 365;

    public OrderService(
            ProductRepository products,
            OrderRepository orders,
            java.util.List<PaymentProvider> providersList,
            EmailService email) {
        this.products = products;
        this.orders   = orders;
        this.providers = providersList.stream()
                .collect(java.util.stream.Collectors.toMap(PaymentProvider::name, p -> p));
        this.email    = email;
    }

    /**
     * Container for what {@link #create(OrderRequest)} returns to the
     * controller. {@code paymentRedirectUrl} is Stripe's hosted checkout
     * URL when configured; null for Razorpay (whose flow uses inline
     * Checkout.js).
     */
    public record CreateResult(Order order, String paymentRedirectUrl) {}

    @Transactional
    public CreateResult create(OrderRequest req) {
        PaymentProvider provider = providers.get(req.paymentMethod());
        if (provider == null) throw new IllegalArgumentException("Unknown payment method: " + req.paymentMethod());

        Order order = new Order();
        order.setName(req.name().trim());
        order.setEmail(req.email().trim().toLowerCase());
        order.setCurrency(req.currency());
        order.setPaymentMethod(req.paymentMethod());

        BigDecimal total = BigDecimal.ZERO;
        for (var line : req.items()) {
            Product p = products.findById(line.productId())
                    .orElseThrow(() -> new NoSuchElementException("Product " + line.productId() + " not found"));
            BigDecimal unit = "INR".equals(req.currency()) ? p.getPriceInr() : p.getPriceUsd();

            OrderItem item = new OrderItem();
            item.setProductId(p.getId());
            item.setProductTitle(p.getTitle());
            item.setProductSlug(p.getSlug());
            item.setPrice(unit);
            item.setQuantity(line.quantity());
            order.addItem(item);

            total = total.add(unit.multiply(BigDecimal.valueOf(line.quantity())));
        }
        order.setTotal(total);

        // Ask the payment provider to create the gateway-side intent. The
        // return value is the hosted checkout URL (Stripe) or null when
        // the provider uses an inline modal (Razorpay).
        String redirectUrl = provider.createPayment(order);

        Order saved = orders.save(order);
        log.info("Created order #{} for {} via {} — total {} {}",
                saved.getId(), saved.getEmail(), saved.getPaymentMethod(),
                saved.getTotal(), saved.getCurrency());
        return new CreateResult(saved, redirectUrl);
    }

    /**
     * Confirms a mock payment. Callers must know the order's email to prevent
     * anonymous enumeration + token theft. Returns null when the caller's
     * email does not match (indistinguishable from "wrong id" — no oracle).
     */
    @Transactional
    public Order confirmMockPayment(Long orderId, String callerEmail) {
        Order order = orders.findById(orderId)
                .orElseThrow(() -> new NoSuchElementException("Order " + orderId + " not found"));

        // Ownership check
        if (callerEmail == null || order.getEmail() == null
                || !order.getEmail().equalsIgnoreCase(callerEmail.trim())) {
            log.warn("confirmMockPayment #{} rejected — email mismatch", orderId);
            return null;
        }

        // Only mock orders may be confirmed via this dev endpoint.
        if (!"mock".equals(order.getPaymentMethod())) {
            log.warn("confirmMockPayment #{} rejected — payment method is {}", orderId, order.getPaymentMethod());
            return null;
        }
        // Idempotency: if the order is already PAID (from an earlier call OR a
        // concurrent one that already committed), return the existing snapshot
        // as-is. Do NOT mint a new download token — the buyer might have
        // bookmarked the one we already handed out.
        //
        // NOTE: This still leaves a small window where two threads read
        // PENDING at the same time, each mints a token, and last-write-wins
        // in the DB. Because this endpoint is @Profile("!prod") — i.e. dev
        // only — that's acceptable. In prod, payment confirmation flows
        // through the Razorpay / Stripe webhook (single-threaded per order).
        if (order.getStatus() != Order.Status.PENDING) return order;
        markPaidAndNotify(order);
        log.info("Order #{} marked PAID (mock).", order.getId());
        return order;
    }

    /**
     * Webhook path — Razorpay / Stripe. Looks up the order by the gateway-
     * side reference we stashed when we created the payment. Idempotent:
     * receiving the same webhook twice returns the already-PAID order
     * unchanged (webhooks retry aggressively — this matters).
     *
     * @return the paid order, or {@code Optional.empty()} if the ref
     *         doesn't match anything we know about (silently ignore —
     *         hostile senders shouldn't get a 404 oracle).
     */
    @Transactional
    public Optional<Order> markPaidByPaymentRef(String paymentRef) {
        if (paymentRef == null || paymentRef.isBlank()) return Optional.empty();
        Optional<Order> found = orders.findByPaymentRef(paymentRef);
        if (found.isEmpty()) {
            log.warn("Webhook payment ref {} does not match any order", paymentRef);
            return Optional.empty();
        }
        Order order = found.get();
        if (order.getStatus() == Order.Status.PAID) {
            log.debug("Webhook re-delivery for already-paid order #{} — noop", order.getId());
            return Optional.of(order);
        }
        if (order.getStatus() != Order.Status.PENDING) {
            log.warn("Webhook for order #{} in unexpected status {} — ignoring", order.getId(), order.getStatus());
            return Optional.empty();
        }
        markPaidAndNotify(order);
        log.info("Order #{} marked PAID via gateway webhook (ref {}).", order.getId(), paymentRef);
        return Optional.of(order);
    }

    /** Shared happy path: mint token, set timestamps, fire confirmation email.
     *  Kept private so mock-confirm and webhook can't diverge in behaviour. */
    private void markPaidAndNotify(Order order) {
        order.setStatus(Order.Status.PAID);
        order.setPaidAt(Instant.now());
        order.setDownloadToken(generateToken());
        order.setExpiresAt(Instant.now().plus(Duration.ofDays(downloadWindowDays)));
        // Save eagerly so the row is durable even if the email step throws
        // (SMTP outages shouldn't roll back a real payment).
        Order saved = orders.save(order);
        try {
            email.notifyOfPaidOrder(saved);
        } catch (Exception e) {
            log.warn("Order #{} paid, but confirmation email failed: {}", saved.getId(), e.getMessage());
        }
    }

    private static String generateToken() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
