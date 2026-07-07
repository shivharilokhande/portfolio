package com.personal.portfolio.store.payment;

import com.personal.portfolio.store.Order;

/** Strategy interface for payment gateways. */
public interface PaymentProvider {
    /** Identifier matching OrderRequest.paymentMethod (razorpay/stripe/mock). */
    String name();

    /**
     * Create a remote payment intent / order. Returns either a redirect URL
     * (hosted checkout) or null if the gateway uses a JS SDK on the client.
     * Stores any gateway-side reference on the local Order via setPaymentRef.
     */
    String createPayment(Order order);
}
