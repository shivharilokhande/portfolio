package com.personal.portfolio.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Simple liveness endpoint at /api/health (in addition to Spring Actuator's
 * /actuator/health). The frontend uses this to display a discreet "API up"
 * indicator in dev builds.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> ping() {
        return Map.of(
                "status", "ok",
                "service", "portfolio-api",
                "time", Instant.now().toString()
        );
    }
}
