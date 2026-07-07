package com.personal.portfolio.admin;

import com.personal.portfolio.store.Product;
import com.personal.portfolio.store.ProductDto;
import com.personal.portfolio.store.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
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
 *   POST   /api/admin/products/{id}/images           — upload one image (multipart)
 *   DELETE /api/admin/products/{id}/images/{name}    — remove one image
 *   GET    /api/store/products/{id}/images/{name}    — public serve (paying + browsing)
 *
 *   Storage: {app.storage.base-path}/product-images/{productId}/{uuid.ext}
 *   Cap: 8 MB per image, JPG/PNG/WebP/GIF.
 *
 *   TODO(prod): swap the local FS writes for a Cloudflare R2 client.
 *   `saveToStorage(bytes, key)` and `deleteFromStorage(key)` are the seams —
 *   replace both with an R2 (or S3-compatible) client and keep the controller
 *   untouched. The URLs stored in `demoImagesJson` become opaque keys.
 */
@RestController
public class ProductImageController {

    private static final Logger log = LoggerFactory.getLogger(ProductImageController.class);
    private static final long MAX_BYTES = 8L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTS  = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");
    private static final Set<String> ALLOWED_MIMES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final ProductRepository products;
    private final Path baseDir;

    public ProductImageController(ProductRepository products,
                                  @Value("${app.storage.base-path}") String basePath) throws IOException {
        this.products = products;
        this.baseDir  = Path.of(basePath, "product-images").toAbsolutePath().normalize();
        Files.createDirectories(this.baseDir);
        log.info("Product image storage: {}", this.baseDir);
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
        // Require a MIME type on the multipart part and match it against the
        // allowlist. Some browsers/clients omit Content-Type when the file's
        // extension is unusual — but at this point we've already accepted the
        // extension, so a missing MIME is a stronger signal that something's
        // off (curl -F, malformed proxy, etc.). Reject rather than trust the
        // extension alone.
        String ct = file.getContentType();
        if (ct == null || ct.isBlank() || !ALLOWED_MIMES.contains(ct.toLowerCase(Locale.ROOT))) {
            return ResponseEntity.status(415).body(Map.of(
                    "error",   "unsupported_media_type",
                    "message", "Upload must include an image MIME type (image/jpeg, image/png, image/webp, image/gif).",
                    "mime",    ct == null ? "" : ct));
        }

        Path productDir = baseDir.resolve(String.valueOf(id)).normalize();
        if (!productDir.startsWith(baseDir)) return ResponseEntity.badRequest().build();
        Files.createDirectories(productDir);

        String filename = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = productDir.resolve(filename).normalize();
        if (!target.startsWith(productDir)) return ResponseEntity.badRequest().build();
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        List<String> gallery = new ArrayList<>(p.demoImageList());
        gallery.add(filename);
        p.setDemoImageList(gallery);
        Product saved = products.save(p);

        log.info("Uploaded demo image {} ({} bytes) for product #{}",
                filename, Files.size(target), id);
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

        Path productDir = baseDir.resolve(String.valueOf(id)).normalize();
        Path target = productDir.resolve(safe).normalize();
        if (!target.startsWith(productDir)) return ResponseEntity.badRequest().build();

        try { Files.deleteIfExists(target); } catch (IOException ignored) {}

        List<String> gallery = new ArrayList<>(p.demoImageList());
        gallery.removeIf(safe::equals);
        p.setDemoImageList(gallery);
        Product saved = products.save(p);

        return ResponseEntity.ok(Map.of("ok", true, "product", ProductDto.from(saved)));
    }

    /* ---------- Public ---------- */

    /**
     * Public image serve. Cheap — reads straight from disk. Set a long
     * cache TTL: image URLs are content-addressed (UUID filename), so a
     * change means a new URL, safe to cache forever.
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

        Path productDir = baseDir.resolve(String.valueOf(id)).normalize();
        Path target = productDir.resolve(safe).normalize();
        if (!target.startsWith(productDir) || !Files.exists(target) || !Files.isRegularFile(target)) {
            return ResponseEntity.notFound().build();
        }

        MediaType contentType = switch (extensionOf(safe)) {
            case ".png"  -> MediaType.IMAGE_PNG;
            case ".gif"  -> MediaType.IMAGE_GIF;
            case ".webp" -> MediaType.valueOf("image/webp");
            default      -> MediaType.IMAGE_JPEG;
        };
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .contentType(contentType)
                .body(new FileSystemResource(target));
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        int i = filename.lastIndexOf('.');
        return i < 0 ? "" : filename.substring(i).toLowerCase(Locale.ROOT);
    }
}
