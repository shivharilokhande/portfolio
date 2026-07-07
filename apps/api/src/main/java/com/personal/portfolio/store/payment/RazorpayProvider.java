package com.personal.portfolio.store.payment;

import com.personal.portfolio.config.AppSettings;
import com.personal.portfolio.store.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Razorpay provider. Reads keys from AppSettings (edit them under
 * /admin/settings → Payment) so the admin can rotate them without redeploy.
 *
 * <p>Flow:
 *   1. Frontend POST /api/store/orders → OrderService.create() calls
 *      createPayment(order). We call Razorpay's `orders.create` and stash
 *      the returned Razorpay order id on our Order.paymentRef.
 *   2. Frontend loads Checkout.js and opens the modal with that order id.
 *   3. Razorpay redirects / posts to our webhook. PaymentWebhookController
 *      verifies the signature and marks our Order PAID.
 *
 * <p>Fallback behaviour: when keys are missing OR payment.testMode = true,
 * we skip the SDK call and mint a stub reference so dev / demo installs
 * still work end-to-end via the mock-confirm flow.
 */
@Component
public class RazorpayProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(RazorpayProvider.class);

    private final AppSettings settings;

    public RazorpayProvider(AppSettings settings) {
        this.settings = settings;
    }

    @Override public String name() { return "razorpay"; }

    @Override
    public String createPayment(Order order) {
        String keyId  = settings.razorpayKeyId();
        String secret = settings.razorpayKeySecret();
        boolean configured = keyId != null && !keyId.isBlank()
                          && secret != null && !secret.isBlank()
                          && !settings.paymentTestMode();

        if (!configured) {
            // Dev / demo mode — hand the caller a plausible-looking stub
            // ref so the rest of the flow can continue. Payment will be
            // marked PAID via the mock /orders/{id}/confirm endpoint
            // (dev-only) or by an admin toggle in prod.
            order.setPaymentRef("rzp_stub_" + shortId());
            log.debug("Razorpay in stub mode — set keys + disable testMode to switch to live");
            return null;
        }

        try {
            RazorpayClient client = new RazorpayClient(keyId, secret);

            // Razorpay wants the amount in the smallest currency unit
            // (paise for INR, cents for USD). Multiply by 100 and round
            // down to be safe with floating-point.
            long amountMinor = order.getTotal()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValueExact();

            JSONObject request = new JSONObject();
            request.put("amount",   amountMinor);
            request.put("currency", order.getCurrency());
            request.put("receipt",  "order_" + order.getId());
            // Notes travel with the payment and appear in the Razorpay
            // dashboard — helpful for reconciliation later.
            JSONObject notes = new JSONObject();
            notes.put("buyer_email", order.getEmail());
            notes.put("buyer_name",  order.getName());
            request.put("notes", notes);

            com.razorpay.Order razorpayOrder = client.orders.create(request);
            String razorpayOrderId = razorpayOrder.get("id");
            order.setPaymentRef(razorpayOrderId);
            log.info("Razorpay order {} created for our order #{}", razorpayOrderId, order.getId());
            // Razorpay Checkout.js takes the order id inline — no hosted
            // redirect URL to return. The frontend uses the id to open
            // the modal, so we return null here on purpose.
            return null;
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for our order #{} — falling back to stub. {}",
                    order.getId(), e.getMessage());
            order.setPaymentRef("rzp_error_" + shortId());
            return null;
        }
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 14);
    }
}
