package com.personal.portfolio.admin;

import com.personal.portfolio.config.AppSetting;
import com.personal.portfolio.config.AppSettingRepository;
import com.personal.portfolio.config.AppSettings;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Admin CRUD for the key/value AppSetting table.
 *
 *   GET  /api/admin/settings         → grouped list of every configurable key
 *   PUT  /api/admin/settings/{key}   → update one value (value is a string)
 *
 *   Secret values (payment keys) are masked in the GET response — the
 *   client only receives the last 4 characters plus "•••" so the admin
 *   can confirm which key is in use without exposing it in the browser.
 */
@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    public record SettingRow(
            String  key,
            String  category,
            String  label,
            String  description,
            String  value,       // masked when secret
            boolean isSecret,
            boolean hasValue,
            String  updatedAt) {}

    /**
     * Cap the length so nobody can PUT a 10 MB blob into `notifications.notifyTo`
     * (or any other key) and blow up memory on every subsequent read. 4 000
     * chars is way more than any real setting ever needs.
     */
    public record UpdateRequest(@NotNull @Size(max = 4000) String value) {}

    private final AppSettingRepository repo;

    public AdminSettingsController(AppSettingRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<SettingRow> list() {
        return repo.findAll().stream()
                .sorted((a, b) -> {
                    int c = a.getCategory().compareTo(b.getCategory());
                    return c != 0 ? c : a.getKey().compareTo(b.getKey());
                })
                .map(this::toRow)
                .toList();
    }

    @PutMapping("/{key}")
    @Transactional
    public ResponseEntity<SettingRow> update(@PathVariable String key,
                                             @Valid @RequestBody UpdateRequest req) {
        AppSetting s = repo.findById(key)
                .orElseThrow(() -> new NoSuchElementException("Setting " + key + " not found"));
        // Type-check the value so silently-corrupt entries can't survive to
        // the runtime read (where AppSettings would fall back to the default,
        // leaving the admin thinking their change stuck).
        String value = req.value();
        if (!value.isEmpty()) {
            if (key.startsWith("rateLimit.")) {
                try { Integer.parseInt(value.trim()); }
                catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Value for '" + key + "' must be an integer.");
                }
            } else if (key.startsWith("features.") || key.startsWith("notifications.autoReply")
                    || key.startsWith("payment.testMode")) {
                String v = value.trim().toLowerCase();
                if (!(v.equals("true") || v.equals("false") || v.equals("1") || v.equals("0"))) {
                    throw new IllegalArgumentException("Value for '" + key + "' must be true/false.");
                }
            } else if (key.startsWith("notifications.notifyTo") || key.startsWith("notifications.fromAddress")) {
                if (!value.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                    throw new IllegalArgumentException("Value for '" + key + "' must be a valid email.");
                }
            } else if (key.equals("payment.defaultCurrency")) {
                String v = value.trim().toUpperCase();
                if (!v.equals("INR") && !v.equals("USD")) {
                    throw new IllegalArgumentException("Currency must be INR or USD.");
                }
            }
        }
        s.setValue(value);
        return ResponseEntity.ok(toRow(repo.save(s)));
    }

    private SettingRow toRow(AppSetting s) {
        boolean isSecret = Boolean.TRUE.equals(s.getSecret());
        String v = s.getValue();
        boolean hasValue = v != null && !v.isBlank();
        String masked = !hasValue
                ? ""
                : (isSecret ? mask(v) : v);
        return new SettingRow(
                s.getKey(),
                s.getCategory(),
                s.getLabel(),
                s.getDescription(),
                masked,
                isSecret,
                hasValue,
                s.getUpdatedAt() == null ? "" : s.getUpdatedAt().toString());
    }

    private static String mask(String v) {
        if (v == null || v.length() <= 4) return "••••";
        return "••••••••" + v.substring(v.length() - 4);
    }
}
