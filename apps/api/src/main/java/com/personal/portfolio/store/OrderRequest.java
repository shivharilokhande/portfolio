package com.personal.portfolio.store;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record OrderRequest(
        @NotBlank @Size(max = 120)            String name,
        @NotBlank @Email @Size(max = 255)     String email,
        @NotEmpty @Valid                      List<Item> items,
        @NotBlank @Pattern(regexp = "INR|USD")
                                              String currency,
        @NotBlank @Pattern(regexp = "razorpay|stripe|mock")
                                              String paymentMethod
) {
    public record Item(
            @NotNull @Positive Long productId,
            @NotNull @Positive @Max(20) Integer quantity
    ) {}
}
