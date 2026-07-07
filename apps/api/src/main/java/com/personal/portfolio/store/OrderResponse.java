package com.personal.portfolio.store;

import java.math.BigDecimal;
import java.util.List;

public record OrderResponse(
        Long          id,
        BigDecimal    total,
        String        currency,
        String        paymentMethod,
        String        paymentRef,
        String        status,
        String        downloadToken,
        /** Hosted-checkout URL for Stripe. Null for Razorpay (uses Checkout.js). */
        String        paymentRedirectUrl,
        /** Razorpay Checkout.js needs the public key id client-side. Null otherwise. */
        String        razorpayKeyId,
        List<Line>    items
) {
    public record Line(Long productId, String title, BigDecimal price) {}

    /** Backwards-compat helper — always includes token. Prefer the 3-arg overload. */
    public static OrderResponse from(Order o, String paymentRedirectUrl) {
        return from(o, paymentRedirectUrl, null, true);
    }

    /** Backwards-compat helper (no razorpayKeyId). */
    public static OrderResponse from(Order o, String paymentRedirectUrl, boolean includeToken) {
        return from(o, paymentRedirectUrl, null, includeToken);
    }

    /**
     * @param includeToken when false, the download token is stripped from the response.
     *                     Use false on any endpoint where ownership of the order isn't proven.
     */
    public static OrderResponse from(Order o, String paymentRedirectUrl,
                                     String razorpayKeyId, boolean includeToken) {
        List<Line> lines = o.getItems().stream()
                .map(it -> new Line(it.getProductId(), it.getProductTitle(), it.getPrice()))
                .toList();
        return new OrderResponse(
                o.getId(),
                o.getTotal(),
                o.getCurrency(),
                o.getPaymentMethod(),
                o.getPaymentRef(),
                o.getStatus().name(),
                includeToken ? o.getDownloadToken() : null,
                paymentRedirectUrl,
                razorpayKeyId,
                lines);
    }
}
