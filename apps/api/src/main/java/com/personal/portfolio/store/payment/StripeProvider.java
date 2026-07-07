package com.personal.portfolio.store.payment;

import com.personal.portfolio.config.AppSettings;
import com.personal.portfolio.store.Order;
import com.personal.portfolio.store.OrderItem;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Stripe provider using Stripe Checkout (hosted). This is the simplest
 * integration — Stripe hosts the payment form, we redirect the buyer to
 * it, and Stripe posts back to our webhook when payment settles.
 *
 * <p>Flow:
 *   1. Frontend creates our Order → OrderService calls createPayment().
 *   2. We call Stripe's `Session.create()` with our order's line items and
 *      a success_url pointing at /store/success/{id}.
 *   3. `createPayment()` returns the Session URL. Frontend redirects there.
 *   4. Buyer pays on Stripe's page. Stripe fires
 *      `checkout.session.completed` at our webhook, which marks our order
 *      PAID and issues the download token.
 *
 * <p>Fallback: when the secret is missing OR payment.testMode is true, we
 * mint a stub reference and return null so the mock-confirm flow can
 * still drive the demo.
 */
@Component
public class StripeProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(StripeProvider.class);

    private final AppSettings settings;
    /** Base URL used when building success/cancel redirects. Falls back to
     *  a localhost address in dev — override with SITE_BASE_URL / the
     *  site.baseUrl admin setting in prod. */
    private final String successBase;

    public StripeProvider(AppSettings settings,
                          @Value("${SITE_BASE_URL:http://localhost:3000}") String successBase) {
        this.settings    = settings;
        this.successBase = successBase;
    }

    @Override public String name() { return "stripe"; }

    @Override
    public String createPayment(Order order) {
        String secret = settings.stripeSecretKey();
        boolean configured = secret != null && !secret.isBlank() && !settings.paymentTestMode();

        if (!configured) {
            order.setPaymentRef("cs_stub_" + shortId());
            log.debug("Stripe in stub mode — set keys + disable testMode to switch to live");
            return null;
        }

        Stripe.apiKey = secret;
        String base = !settings.siteBaseUrl().isBlank() ? settings.siteBaseUrl() : successBase;

        try {
            SessionCreateParams.Builder params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(base + "/store/success/" + order.getId() + "?token={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(base + "/store/cart")
                    .setCustomerEmail(order.getEmail())
                    .putMetadata("order_id",   String.valueOf(order.getId()))
                    .putMetadata("buyer_name", order.getName());

            String stripeCurrency = order.getCurrency().toLowerCase();
            for (OrderItem it : order.getItems()) {
                long unitMinor = it.getPrice()
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(0, RoundingMode.HALF_UP)
                        .longValueExact();
                params.addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity((long) it.getQuantity())
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(stripeCurrency)
                                                .setUnitAmount(unitMinor)
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName(it.getProductTitle())
                                                                .build()
                                                )
                                                .build()
                                )
                                .build()
                );
            }

            Session session = Session.create(params.build());
            order.setPaymentRef(session.getId());
            log.info("Stripe Checkout session {} created for our order #{}", session.getId(), order.getId());
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Stripe session creation failed for our order #{} — falling back to stub. {}",
                    order.getId(), e.getMessage());
            order.setPaymentRef("cs_error_" + shortId());
            return null;
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 18);
    }
}
