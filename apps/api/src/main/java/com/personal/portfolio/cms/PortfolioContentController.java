package com.personal.portfolio.cms;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Portfolio CMS endpoints.
 *
 *   PUBLIC (read-only, no auth):
 *     GET  /api/portfolio                — list every section (key, label)
 *     GET  /api/portfolio/{key}          — body JSON for one section
 *
 *   ADMIN (gated by AdminAuthFilter via prefix /api/admin/):
 *     GET  /api/admin/portfolio          — full list with bodies
 *     PUT  /api/admin/portfolio/{key}    — replace the body JSON
 *     POST /api/admin/portfolio          — create a new section
 *     DELETE /api/admin/portfolio/{key}  — remove a section
 */
@RestController
@org.springframework.validation.annotation.Validated // enable @PathVariable + method-level constraint validation
public class PortfolioContentController {

    public record SectionSummary(String key, String label, Instant updatedAt) {}
    public record SectionFull(String key, String label, Object body, Instant updatedAt) {}
    /**
     * Upsert payload.
     *
     *   key   — required on POST (create). NULL on PUT (path variable used).
     *           Length + charset capped so admins can't post multi-MB keys or
     *           smuggle path segments.
     *   label — optional; capped so it can't overflow list rendering.
     *   body  — any JSON; serialised body is capped at 100 KB inside toJson().
     */
    public record UpsertRequest(
            @Size(max = 64)
            @Pattern(regexp = "[a-zA-Z0-9._-]+", message = "key must be alphanumeric, dot, dash, or underscore")
            String key,
            @Size(max = 256) String label,
            Object body) {}

    /** Hard cap on serialised body size to keep memory + response times sane. */
    private static final int MAX_BODY_BYTES = 100_000;

    private final PortfolioContentRepository repo;
    private final ObjectMapper mapper;

    public PortfolioContentController(PortfolioContentRepository repo, ObjectMapper mapper) {
        this.repo   = repo;
        this.mapper = mapper;
    }

    /* ---------- public ---------- */

    @GetMapping("/api/portfolio")
    public List<SectionSummary> publicList() {
        return repo.findAll().stream()
                .map(c -> new SectionSummary(c.getSectionKey(), c.getLabel(), c.getUpdatedAt()))
                .toList();
    }

    @GetMapping("/api/portfolio/{key}")
    public ResponseEntity<Object> publicGet(@PathVariable String key) {
        var found = repo.findById(key);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(parse(found.get().getBody()));
    }

    /* ---------- admin ---------- */

    @GetMapping("/api/admin/portfolio")
    public List<SectionFull> adminList() {
        return repo.findAll().stream()
                .map(c -> new SectionFull(c.getSectionKey(), c.getLabel(),
                        parse(c.getBody()), c.getUpdatedAt()))
                .toList();
    }

    @PostMapping("/api/admin/portfolio")
    @Transactional
    @CacheEvict(value = "portfolioSections", allEntries = true)
    public SectionFull create(@Valid @RequestBody UpsertRequest req) {
        if (req.key() == null || req.key().isBlank()) {
            throw new IllegalArgumentException("key is required on create");
        }
        PortfolioContent c = new PortfolioContent();
        c.setSectionKey(req.key());
        c.setLabel(req.label());
        c.setBody(toJson(req.body()));
        c.setUpdatedAt(Instant.now());
        var saved = repo.save(c);
        return new SectionFull(saved.getSectionKey(), saved.getLabel(),
                parse(saved.getBody()), saved.getUpdatedAt());
    }

    @PutMapping("/api/admin/portfolio/{key}")
    @Transactional
    @CacheEvict(value = "portfolioSections", allEntries = true)
    public SectionFull update(@PathVariable @NotBlank @Size(max = 64)
                              @Pattern(regexp = "[a-zA-Z0-9._-]+") String key,
                              @Valid @RequestBody UpsertRequest req) {
        var c = repo.findById(key)
                .orElseThrow(() -> new NoSuchElementException("Section " + key + " not found"));
        if (req.label() != null) c.setLabel(req.label());
        if (req.body()  != null) c.setBody(toJson(req.body()));
        var saved = repo.save(c);
        return new SectionFull(saved.getSectionKey(), saved.getLabel(),
                parse(saved.getBody()), saved.getUpdatedAt());
    }

    @DeleteMapping("/api/admin/portfolio/{key}")
    @CacheEvict(value = "portfolioSections", allEntries = true)
    public ResponseEntity<?> delete(@PathVariable @NotBlank String key) {
        if (!repo.existsById(key)) return ResponseEntity.notFound().build();
        repo.deleteById(key);
        return ResponseEntity.noContent().build();
    }

    /* ---------- helpers ---------- */

    private Object parse(String s) {
        try { return mapper.readTree(s); }
        catch (JsonProcessingException e) { return Map.of("error", "invalid_json", "raw", s); }
    }

    private String toJson(Object body) {
        try {
            String out;
            if (body instanceof String s) {
                // already a JSON string? parse-and-reserialise to validate
                JsonNode n = mapper.readTree(s);
                out = mapper.writeValueAsString(n);
            } else {
                out = mapper.writeValueAsString(body);
            }
            // Cap body size so an admin (or something with an admin token)
            // can't stuff 10 MB into a single section and blow up memory on
            // every public read.
            if (out.length() > MAX_BODY_BYTES) {
                throw new IllegalArgumentException(
                        "Body too large: " + out.length() + " bytes (max " + MAX_BODY_BYTES + ")");
            }
            return out;
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Body is not valid JSON: " + e.getMessage());
        }
    }
}
