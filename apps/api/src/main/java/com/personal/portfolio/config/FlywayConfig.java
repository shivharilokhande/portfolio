package com.personal.portfolio.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Flyway startup behaviour.
 *
 * <p>In the dev/local profile a botched migration otherwise leaves the app
 * unable to boot — Flyway parks the failed row in {@code flyway_schema_history}
 * and refuses to touch anything else. Running {@code repair()} before every
 * {@code migrate()} auto-clears failed history entries so a fixed migration
 * file just works on the next start.
 *
 * <p>This is intentionally NOT enabled in prod: silently repairing a broken
 * migration on a real database can mask serious data issues. In prod, a
 * failed migration should be a loud stop so the operator inspects it.
 */
@Configuration
public class FlywayConfig {

    @Bean
    @Profile("!prod")
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            // Clean up any failed migration rows from prior runs.
            flyway.repair();
            flyway.migrate();
        };
    }
}
