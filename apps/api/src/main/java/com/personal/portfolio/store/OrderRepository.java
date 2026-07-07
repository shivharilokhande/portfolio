package com.personal.portfolio.store;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByDownloadToken(String token);

    /** Lookup by gateway-side reference (Razorpay order id, Stripe session id).
     *  Used by webhook controllers to match an incoming event to our Order. */
    Optional<Order> findByPaymentRef(String paymentRef);

    /** Count orders by status — used by admin stats to avoid loading whole table. */
    long countByStatus(Order.Status status);

    /** Sum of total column for orders matching status + currency. Returns null when no rows. */
    @Query("select coalesce(sum(o.total), 0) from Order o where o.status = :status and o.currency = :currency")
    BigDecimal sumTotalByStatusAndCurrency(@Param("status") Order.Status status,
                                           @Param("currency") String currency);
}
