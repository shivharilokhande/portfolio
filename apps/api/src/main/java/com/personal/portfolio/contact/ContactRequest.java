package com.personal.portfolio.contact;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Inbound payload for POST /api/contact.
 *
 *   `hp` is a honeypot field — the frontend hides it visually and leaves it
 *   empty. Bots that scrape the form and blindly fill every input will
 *   populate it, and the service flags the submission as SPAM. The
 *   `@JsonAlias("hp_field")` matches the DOM name our current form uses.
 */
public record ContactRequest(
        @NotBlank @Size(max = 120)              String name,
        @NotBlank @Email @Size(max = 255)       String email,
        @Size(max = 160)                        String company,
        @Size(max = 120)                        String projectType,
        @NotBlank @Size(min = 10, max = 4000)   String message,
        @JsonAlias({"hp_field", "honeypot"})
        @Size(max = 200)                        String hp
) { }
