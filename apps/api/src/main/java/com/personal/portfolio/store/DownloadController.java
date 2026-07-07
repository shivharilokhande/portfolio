package com.personal.portfolio.store;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 *   GET /api/store/downloads/{token}        → bundle (lists each file with a signed URL)
 *   GET /api/store/downloads/{token}/file/{productId} → stream the file (stub: 302 to assetPath)
 */
@RestController
@RequestMapping("/api/store/downloads")
public class DownloadController {

    public record DownloadBundleDto(
            Long             orderId,
            String           email,
            String           paidAt,
            String           expiresAt,
            List<DownloadItem> items
    ) {}

    public record DownloadItem(
            Long    productId,
            String  slug,
            String  title,
            Integer fileSizeMb,
            String  downloadUrl
    ) {}

    private final OrderRepository orders;
    private final ProductRepository products;
    private final Path baseDir;
    /** Cap on file downloads per token per rolling hour. Legitimate buyers
     *  download each item a handful of times — 20/hour is generous. A
     *  leaked link that goes viral on Reddit gets throttled fast, and the
     *  bundle-view endpoint isn't counted so buyers can still browse. */
    private static final int MAX_FILE_DOWNLOADS_PER_HOUR = 20;
    /** Per-token counters, aged out after 1 hour of no writes. Bounded so
     *  a flood of unique tokens can't OOM the JVM. */
    private final Cache<String, AtomicInteger> tokenHits = Caffeine.newBuilder()
            .maximumSize(50_000)
            .expireAfterWrite(Duration.ofHours(1))
            .build();

    public DownloadController(OrderRepository orders,
                              ProductRepository products,
                              @Value("${app.storage.base-path}") String basePath) {
        this.orders   = orders;
        this.products = products;
        this.baseDir  = Path.of(basePath, "products").toAbsolutePath().normalize();
    }

    @GetMapping("/{token}")
    public ResponseEntity<DownloadBundleDto> bundle(@PathVariable String token) {
        Optional<Order> found = orders.findByDownloadToken(token);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        Order o = found.get();

        if (o.getStatus() != Order.Status.PAID) return ResponseEntity.status(403).build();
        if (o.getExpiresAt() != null && Instant.now().isAfter(o.getExpiresAt()))
            return ResponseEntity.status(410).build();

        String base = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/store/downloads/" + token + "/file/")
                .toUriString();

        // Batch-load products in a single query to keep this endpoint O(1)
        // regardless of order size. Previously each item hit
        // products.findById(...) individually — an N+1 that a legitimate
        // customer with a big order (or a malicious replay) could weaponise.
        List<Long> ids = o.getItems().stream().map(OrderItem::getProductId).toList();
        Map<Long, Product> byId = products.findAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a, HashMap::new));

        List<DownloadItem> items = o.getItems().stream().map(it -> {
            Product p = byId.get(it.getProductId());
            return new DownloadItem(
                    it.getProductId(),
                    it.getProductSlug(),
                    it.getProductTitle(),
                    p == null ? 0 : p.getFileSizeMb(),
                    base + it.getProductId());
        }).toList();

        return ResponseEntity.ok(new DownloadBundleDto(
                o.getId(),
                o.getEmail(),
                o.getPaidAt() == null ? "" : o.getPaidAt().toString(),
                o.getExpiresAt() == null ? "" : o.getExpiresAt().toString(),
                items));
    }

    /**
     * Streams the asset file to a paying customer. In a full deploy this would
     * redirect to a pre-signed S3 URL — for now we stream from local disk.
     *
     *   Safety guarantees:
     *   - token must match a PAID, non-expired order
     *   - product must be part of that order (prevents cross-order access)
     *   - asset path must resolve INSIDE the configured baseDir (no traversal)
     */
    @GetMapping("/{token}/file/{productId}")
    public ResponseEntity<?> file(@PathVariable String token, @PathVariable Long productId) {
        Optional<Order> found = orders.findByDownloadToken(token);
        if (found.isEmpty()) return ResponseEntity.status(403).build();
        Order o = found.get();
        if (o.getStatus() != Order.Status.PAID) return ResponseEntity.status(403).build();
        if (o.getExpiresAt() != null && Instant.now().isAfter(o.getExpiresAt()))
            return ResponseEntity.status(410).build();

        // Ownership: the product must belong to this order.
        boolean belongs = o.getItems().stream().anyMatch(it -> productId.equals(it.getProductId()));
        if (!belongs) return ResponseEntity.status(403).build();

        // Per-token throttle. Legitimate buyers hit this a couple of times
        // per file; if a link gets leaked on Reddit or a scraper hammers
        // it, the counter cuts them off well before we serve gigabytes to
        // free-riders. Legitimate buyers get a fresh window every hour.
        AtomicInteger hits = tokenHits.get(token, k -> new AtomicInteger(0));
        int current = hits.incrementAndGet();
        if (current > MAX_FILE_DOWNLOADS_PER_HOUR) {
            return ResponseEntity.status(429)
                    .header("Retry-After", "3600")
                    .body("Download quota exceeded for this link. Try again in an hour, or reply to your order email for a fresh link.");
        }

        Product p = products.findById(productId).orElse(null);
        if (p == null || p.getAssetPath() == null || p.getAssetPath().isBlank())
            return ResponseEntity.status(404).body("Asset not yet uploaded for product " + productId);

        // Path-traversal guard: resolved absolute path must be inside baseDir.
        Path path = Path.of(p.getAssetPath()).toAbsolutePath().normalize();
        if (!path.startsWith(baseDir) || !Files.exists(path) || !Files.isRegularFile(path)) {
            return ResponseEntity.status(404).build();
        }

        String filename = path.getFileName().toString();
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .header("X-RateLimit-Remaining", String.valueOf(Math.max(0, MAX_FILE_DOWNLOADS_PER_HOUR - current)))
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new FileSystemResource(path));
    }
}
