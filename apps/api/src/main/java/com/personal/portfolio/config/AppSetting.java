package com.personal.portfolio.config;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Single-row-per-key admin-configurable setting.
 *
 *   Values are stored as strings; the app coerces to boolean / int / JSON
 *   at the call site. `isSecret = true` marks values that must NOT be
 *   returned to the browser except when explicitly requested by the
 *   admin — API responses mask them.
 */
@Entity
@Table(name = "app_setting")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class AppSetting {

    @Id
    @Column(name = "setting_key", nullable = false, length = 120)
    private String key;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(length = 400)
    private String description;

    @Column(name = "value_text", columnDefinition = "TEXT")
    private String value;

    @Column(name = "is_secret", nullable = false)
    private Boolean secret = Boolean.FALSE;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() { this.updatedAt = Instant.now(); }
}
