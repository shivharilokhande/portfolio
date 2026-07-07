package com.personal.portfolio.store;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Digital product sellable through the store. */
@Entity
@Table(name = "store_product")
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PUBLIC)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120, unique = true)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 400)
    private String tagline;

    // Use TEXT (works on H2 + PostgreSQL); avoid @Lob which maps to CLOB
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "price_inr", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceInr;

    @Column(name = "price_usd", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceUsd;

    @Column(name = "cover_color", nullable = false, length = 40)
    private String coverColor;

    /** CSV — short list, no UI to author yet. */
    @Column(nullable = false, length = 400)
    private String tags;

    @Column(name = "features",     nullable = false, length = 2000)
    private String featuresCsv;

    @Column(name = "what_you_get", nullable = false, length = 2000)
    private String whatYouGetCsv;

    @Column(name = "tech_stack",   nullable = false, length = 600)
    private String techStackCsv;

    @Column(name = "file_size_mb", nullable = false)
    private Integer fileSizeMb;

    @Column(nullable = false, length = 20)
    private String version = "1.0.0";

    @Column(name = "demo_url", length = 400) private String demoUrl;
    @Column(name = "repo_url", length = 400) private String repoUrl;

    /** Path on disk (or S3 key) to the source archive — exposed only via signed URL. */
    @Column(name = "asset_path", length = 400)
    private String assetPath;

    /**
     * JSON array of demo-image filenames (relative to
     * {app.storage.base-path}/product-images/{id}/). Publicly readable via
     * GET /api/store/products/{id}/images/{filename}. Small helper below
     * for typed access; the raw column stays a string for schema portability.
     *
     * SQL column is TEXT NULL (see V10). Java always writes at least "[]" so
     * consumers can rely on non-null values.
     */
    @Column(name = "demo_images", columnDefinition = "TEXT")
    private String demoImagesJson = "[]";

    @Column(nullable = false) private Boolean featured  = Boolean.TRUE;
    @Column(nullable = false) private Boolean published = Boolean.TRUE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public List<String> tagList()       { return split(tags); }
    public List<String> featureList()   { return splitPipe(featuresCsv); }
    public List<String> whatYouGet()    { return splitPipe(whatYouGetCsv); }
    public List<String> techStackList() { return split(techStackCsv); }

    /** Parsed list of demo-image filenames. Never returns null. */
    public List<String> demoImageList() {
        String json = demoImagesJson;
        if (json == null || json.isBlank()) return List.of();
        try {
            List<String> parsed = MAPPER.readValue(json, IMAGES_TYPE);
            return parsed == null ? List.of() : parsed;
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    /** Serialise the given list back into the demo_images column. */
    public void setDemoImageList(List<String> names) {
        try {
            this.demoImagesJson = MAPPER.writeValueAsString(names == null ? new ArrayList<>() : names);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Bad demo image list", e);
        }
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> IMAGES_TYPE = new TypeReference<>() {};

    private static List<String> split(String v) {
        if (v == null || v.isBlank()) return List.of();
        return Arrays.stream(v.split("\\s*,\\s*")).filter(s -> !s.isBlank()).toList();
    }
    private static List<String> splitPipe(String v) {
        if (v == null || v.isBlank()) return List.of();
        return Arrays.stream(v.split("\\s*\\|\\s*")).filter(s -> !s.isBlank()).toList();
    }
}
