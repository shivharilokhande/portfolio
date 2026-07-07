package com.personal.portfolio.store.payment;

import com.personal.portfolio.store.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Mock payment provider — dev/test only. Generates a fake payment reference and
 * lets the client confirm via POST /api/store/orders/{id}/confirm. Never
 * registered in prod so real deploys can't hand out free download tokens.
 */
@Component
@Profile("!prod")
public class MockProvider implements PaymentProvider {
    @Override public String name() { return "mock"; }

    @Override
    public String createPayment(Order order) {
        order.setPaymentRef("mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        return null; // no hosted redirect URL — client handles confirm directly
    }
}
