package com.personal.portfolio.store;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A purchase order — pending until paid, then a download token is minted. */
@Entity
@Table(name = "store_order")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class Order {

    public enum Status { PENDING, PAID, CANCELLED, REFUNDED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, length = 255) private String email;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Column(nullable = false, length = 8)
    private String currency;            // INR | USD

    @Column(name = "payment_method", nullable = false, length = 32)
    private String paymentMethod;       // razorpay | stripe | mock

    @Column(name = "payment_ref", length = 200)
    private String paymentRef;          // gateway-side order/intent id

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "download_token", length = 80, unique = true)
    private String downloadToken;       // null until paid

    @Column(name = "expires_at")
    private Instant expiresAt;          // download window

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "paid_at")
    private Instant paidAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item) {
        item.setOrder(this);
        items.add(item);
    }
}
