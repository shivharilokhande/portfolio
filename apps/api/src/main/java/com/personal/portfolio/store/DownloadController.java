package com.personal.portfolio.store;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.personal.portfolio.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * <pre>
 *   GET /api/store/downloads/{token}                     → bundle (list of files + signed URLs)
 *   GET /api/store/downloads/{token}/file/{productId}    → 302 to presigned R2 URL for that file
 * </pre>
 *
 * <p>Once the storage migration lands, the bytes never flow through this
 * app. We validate the download token + order state + rate limit, then
 * return a 302 redirect to a short-lived presigned R2 URL. Buyers download
 * directly from Cloudflare's edge — free egress, near-zero CPU cost on our
 * side, and the URL expires in ~2 minutes so a leaked link is useless
 * immediately.
 *
 * <p>Legacy orders where {@code assetPath} is an absolute filesystem path
 * (pre-migration) can no longer be served — the file is on the wiped
 * Render disk. The endpoint returns 410 Gone with a hint to re-upload.
 */
@RestController
@RequestMapping("/api/store/downloads")
// Both handlers dereference Order.items which is FetchType.LAZY. Without an
// active persistence session Hibernate throws LazyInitializationException at
// serialization time, which the global handler turns into 500 "Link not
// valid" from the client's perspective. readOnly=true so the tx doesn't
// pretend to be able to write.
@Transactional(readOnly = true)
public class DownloadController {

    private static final Logger log = LoggerFactory.getLogger(DownloadController.class);
    /** How long each presigned URL is valid. Two minutes is long enough for
     *  a slow retry, short enough that copy-pasting the URL into a chat
     *  won't leak the download to anyone who sees it later. */
    private static final Duration PRESIGN_TTL = Duration.ofSeconds(120);

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
    private final StorageService storage;
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
                              StorageService storage) {
        this.orders   = orders;
        this.products = products;
        this.storage  = storage;
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
     * Redirects the paying customer to a short-lived presigned R2 URL for
     * their file. The app validates the download token and order state,
     * then hands off — the bytes come from Cloudflare's edge, not us.
     *
     *   Safety guarantees:
     *   - token must match a PAID, non-expired order
     *   - product must be part of that order (prevents cross-order access)
     *   - per-token quota bounds link-sharing damage (20 hits/hour)
     */
    @GetMapping("/{token}/file/{productId}")
    public ResponseEntity<?> file(@PathVariable String token, @PathVariable Long productId) throws IOException {
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

        String key = p.getAssetPath();
        // Legacy path guard — old rows may hold absolute FS paths that no
        // longer exist. Those bytes are gone; the seller must re-upload.
        if (key.startsWith("/") || key.contains(":")) {
            log.warn("Product #{} has a legacy filesystem path in assetPath; the file is not in R2. Re-upload required.", productId);
            return ResponseEntity.status(410).body(
                    "The file for this product needs to be re-uploaded to the new storage backend. "
                    + "The seller has been notified.");
        }
        if (!storage.exists(key)) {
            log.warn("Product #{} references key {} which is not in storage.", productId, key);
            return ResponseEntity.status(404).build();
        }

        String signed = storage.presignedGetUrl(key, PRESIGN_TTL);
        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, signed)
                .header("X-RateLimit-Remaining", String.valueOf(Math.max(0, MAX_FILE_DOWNLOADS_PER_HOUR - current)))
                // Never let a 302 or its Location header get cached — the
                // presigned URL expires quickly and a stale redirect is a
                // guaranteed download failure.
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .build();
    }
}
