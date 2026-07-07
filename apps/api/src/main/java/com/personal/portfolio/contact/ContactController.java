package com.personal.portfolio.contact;

import com.personal.portfolio.config.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 *   POST /api/contact   — submit a contact form (validated, rate-limited)
 */
@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final ContactService service;
    private final ClientIpResolver ipResolver;

    public ContactController(ContactService service, ClientIpResolver ipResolver) {
        this.service    = service;
        this.ipResolver = ipResolver;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, Object> submit(@Valid @RequestBody ContactRequest req,
                                      HttpServletRequest http) {
        // Use the same trusted-proxy config the rate limiter honours so a
        // spoofed X-Forwarded-For can't pollute the IP-hash-based spam
        // heuristic or the audit trail.
        String ip = ipResolver.resolve(http);

        ContactSubmission saved = service.submit(req, ip, http.getHeader("User-Agent"));
        return Map.of(
                "id", saved.getId(),
                "status", "received",
                "message", "Thanks — I'll reply within 24 hours."
        );
    }
}
