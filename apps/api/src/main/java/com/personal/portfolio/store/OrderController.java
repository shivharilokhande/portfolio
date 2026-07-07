package com.personal.portfolio.store;

import com.personal.portfolio.config.AppSettings;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/store/orders")
@Transactional(readOnly = true) // open-in-view=false + lazy items → need session here
public class OrderController {

    /** Body required for mock-confirm — the caller must know the order email to prove ownership. */
    public record ConfirmRequest(@NotBlank @Email String email) {}

    private final OrderService service;
    private final OrderRepository repo;
    private final AppSettings settings;
    private final boolean allowMockConfirm;

    public OrderController(OrderService service, OrderRepository repo,
                           AppSettings settings, Environment env) {
        this.service  = service;
        this.repo     = repo;
        this.settings = settings;
        // Mock-confirm is a dev-only shortcut. Do not accept it when running
        // under the "prod" profile — real payment goes through the Razorpay /
        // Stripe webhook, not this endpoint.
        this.allowMockConfirm = Arrays.stream(env.getActiveProfiles())
                .noneMatch("prod"::equalsIgnoreCase);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public OrderResponse create(@Valid @RequestBody OrderRequest req) {
        OrderService.CreateResult res = service.create(req);
        // For Razorpay we hand the frontend the public Razorpay key id so
        // Checkout.js can open the modal against the order we just created.
        // The keyId is safe to expose client-side (not a secret).
        String razorpayKey = "razorpay".equals(res.order().getPaymentMethod())
                ? settings.razorpayKeyId() : null;
        return OrderResponse.from(res.order(), res.paymentRedirectUrl(),
                                  razorpayKey, /* includeToken */ true);
    }

    /**
     * Mock-confirm — dev/testing path only. Returns 404 in prod so it appears
     * as if the route doesn't exist, forcing real payment through the
     * webhook. Requires caller to prove ownership by matching the order
     * email even in dev.
     *
     * <p>(We can't use @Profile on the method — Spring only respects it on
     * bean definitions — so the profile check runs at request time.)
     */
    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<OrderResponse> confirm(@PathVariable Long id,
                                                 @Valid @RequestBody ConfirmRequest body) {
        if (!allowMockConfirm) return ResponseEntity.notFound().build();
        Order paid = service.confirmMockPayment(id, body.email());
        if (paid == null) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(OrderResponse.from(paid, null, /* includeToken */ true));
    }

    /**
     * Public order lookup. Requires ?email= to match — otherwise a caller could
     * enumerate order IDs and fish out other buyers' download tokens.
     *
     * <p>To close the enumeration side-channel entirely, an email mismatch
     * returns the SAME 404 response an unknown-id would. Previously we'd
     * return 200 with the token stripped, which let an attacker walk IDs and
     * learn which ones belong to real customers just by counting 200s.
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> get(@PathVariable Long id,
                                             @RequestParam(required = false) String email) {
        var found = repo.findById(id);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        Order o = found.get();
        boolean ownershipOk = email != null && !email.isBlank()
                && o.getEmail() != null
                && o.getEmail().equalsIgnoreCase(email.trim());
        if (!ownershipOk) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(OrderResponse.from(o, null, /* includeToken */ true));
    }
}
