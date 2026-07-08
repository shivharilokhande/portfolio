package com.personal.portfolio.admin;

import com.personal.portfolio.storage.StorageService;
import com.personal.portfolio.store.Product;
import com.personal.portfolio.store.ProductDto;
import com.personal.portfolio.store.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

/**
 * Admin demo-image gallery for a product.
 *
 * <pre>
 *   POST   /api/admin/products/{id}/images           — upload one image (multipart)
 *   DELETE /api/admin/products/{id}/images/{name}    — remove one image
 *   GET    /api/store/products/{id}/images/{name}    — public serve (302 to R2 URL)
 * </pre>
 *
 * <p>Storage key: {@code product-images/{productId}/{uuid.ext}}. The DB row
 * only holds the filename (opaque UUID + extension); the key is reconstructed
 * as {@code product-images/{productId}/{filename}}. This layout works for
 * both the R2 impl (flat bucket) and the local FS impl (nested dirs).
 *
 * <p>Public serve is a 302 to the R2 public URL — we skip streaming through
 * our Spring instance so image traffic doesn't consume the (limited) Render
 * request budget. The URL is content-addressed (UUID filename), so once a
 * client sees it they can cache it forever.
 */
@RestController
public class ProductImageController {

    private static final Logger log = LoggerFactory.getLogger(ProductImageController.class);
    private static final long MAX_BYTES = 8L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTS  = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");
    private static final Set<String> ALLOWED_MIMES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final ProductRepository products;
    private final StorageService storage;

    public ProductImageController(ProductRepository products, StorageService storage) {
        this.products = products;
        this.storage  = storage;
    }

    /* ---------- Admin ---------- */

    @PostMapping(path = "/api/admin/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    @Transactional
    public ResponseEntity<?> upload(@PathVariable Long id,
                                    @RequestPart("file") MultipartFile file) throws IOException {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));

        if (file.isEmpty())              return ResponseEntity.badRequest().body(Map.of("error", "file_empty"));
        if (file.getSize() > MAX_BYTES)  return ResponseEntity.status(413).body(Map.of("error", "file_too_large", "limitMb", 8));

        String ext = extensionOf(file.getOriginalFilename());
        if (!ALLOWED_EXTS.contains(ext)) {
            return ResponseEntity.status(415).body(Map.of(
                    "error",   "unsupported_media_type",
                    "message", "Only JPG / PNG / WebP / GIF images are accepted."));
        }
        String ct = file.getContentType();
        if (ct == null || ct.isBlank() || !ALLOWED_MIMES.contains(ct.toLowerCase(Locale.ROOT))) {
            return ResponseEntity.status(415).body(Map.of(
                    "error",   "unsupported_media_type",
                    "message", "Upload must include an image MIME type (image/jpeg, image/png, image/webp, image/gif).",
                    "mime",    ct == null ? "" : ct));
        }

        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        String key = "product-images/" + id + "/" + filename;

        storage.upload(key, file.getInputStream(), file.getSize(), ct);

        List<String> gallery = new ArrayList<>(p.demoImageList());
        gallery.add(filename);
        p.setDemoImageList(gallery);
        Product saved = products.save(p);

        log.info("Uploaded demo image {} ({} bytes) for product #{}", key, file.getSize(), id);
        return ResponseEntity.ok(Map.of(
                "ok",       true,
                "fileName", filename,
                "product",  ProductDto.from(saved)));
    }

    @DeleteMapping("/api/admin/products/{id}/images/{name}")
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    @Transactional
    public ResponseEntity<?> remove(@PathVariable Long id, @PathVariable String name) throws IOException {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));

        // Sanitise the incoming name — must be a plain filename, no separators.
        String safe = name.replaceAll("[^A-Za-z0-9._-]", "");
        if (!safe.equals(name)) return ResponseEntity.badRequest().build();

        try { storage.delete("product-images/" + id + "/" + safe); }
        catch (IOException e) { log.warn("Could not delete image {}: {}", safe, e.getMessage()); }

        List<String> gallery = new ArrayList<>(p.demoImageList());
        gallery.removeIf(safe::equals);
        p.setDemoImageList(gallery);
        Product saved = products.save(p);

        return ResponseEntity.ok(Map.of("ok", true, "product", ProductDto.from(saved)));
    }

    /* ---------- Public ---------- */

    /**
     * Public image serve. Redirects to the storage provider's public URL so
     * image bandwidth doesn't touch our Spring instance. The URL is
     * content-addressed (UUID filename), so the redirect target is
     * effectively immutable — the redirect itself can safely be cached
     * for a long TTL by intermediate CDNs.
     *
     * <p>Only serves images for PUBLISHED products. An attacker who guesses
     * a UUID filename shouldn't be able to preview draft product artwork
     * before launch.
     */
    @GetMapping("/api/store/products/{id}/images/{name}")
    public ResponseEntity<?> get(@PathVariable Long id, @PathVariable String name) {
        String safe = name.replaceAll("[^A-Za-z0-9._-]", "");
        if (!safe.equals(name)) return ResponseEntity.badRequest().build();

        // Draft / unpublished products don't serve public images.
        boolean published = products.findById(id)
                .map(Product::getPublished)
                .map(Boolean.TRUE::equals)
                .orElse(false);
        if (!published) return ResponseEntity.notFound().build();

        String key = "product-images/" + id + "/" + safe;
        String url = storage.publicUrl(key);
        // Long cache TTL is safe: filenames are UUIDs, so a changed image
        // gets a new URL. If the underlying object is deleted, the redirect
        // may 404 in R2 — clients handle that gracefully (broken-image icon).
        return ResponseEntity.status(302)
                .header(HttpHeaders.LOCATION, url)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .build();
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        int i = filename.lastIndexOf('.');
        return i < 0 ? "" : filename.substring(i).toLowerCase(Locale.ROOT);
    }
}
