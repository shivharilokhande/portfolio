package com.personal.portfolio.admin;

import com.personal.portfolio.storage.StorageService;
import com.personal.portfolio.store.Product;
import com.personal.portfolio.store.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

/**
 * Admin-only digital-asset uploads.
 *
 * <pre>
 *   POST   /api/admin/products/{id}/asset     — multipart upload (ZIP / TGZ / 7Z)
 *   DELETE /api/admin/products/{id}/asset     — wipe the stored file
 *   GET    /api/admin/products/{id}/asset     — preview / download from admin
 * </pre>
 *
 * <p>Files are stored via {@link StorageService} under the object key
 * {@code products/{id}-{sanitizedFilename}.{ext}}. This key is what we
 * persist in {@code Product.assetPath} — it is stable across storage
 * providers (R2, local disk, future S3), so switching providers doesn't
 * require a DB migration.
 *
 * <p>Path-traversal guards from the pre-migration version are unnecessary
 * against R2 (object keys are just strings, not filesystem paths) but we
 * still sanitise the user-supplied filename to keep keys readable.
 */
@RestController
@RequestMapping("/api/admin/products/{id}/asset")
public class ProductAssetController {

    private static final Logger log = LoggerFactory.getLogger(ProductAssetController.class);
    private static final long MAX_BYTES = 200L * 1024 * 1024;
    /** Extensions we accept for the digital-product bundle. Everything else is refused. */
    private static final Set<String> ALLOWED_EXTS = Set.of(
            ".zip", ".tar", ".tgz", ".gz", ".7z"
    );

    private final ProductRepository products;
    private final StorageService storage;

    public ProductAssetController(ProductRepository products, StorageService storage) {
        this.products = products;
        this.storage  = storage;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    public ResponseEntity<?> upload(@PathVariable Long id,
                                    @RequestPart("file") MultipartFile file) throws IOException {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));

        if (file.isEmpty())                 return ResponseEntity.badRequest().body(Map.of("error", "file_empty"));
        if (file.getSize() > MAX_BYTES)     return ResponseEntity.status(413).body(Map.of("error", "file_too_large", "limitMb", 200));

        String original = sanitise(file.getOriginalFilename());
        String ext = extensionOf(original);
        if (!ALLOWED_EXTS.contains(ext)) {
            return ResponseEntity.status(415).body(Map.of(
                    "error",   "unsupported_media_type",
                    "message", "Only ZIP / TAR / TGZ / GZ / 7Z bundles are accepted."));
        }

        // Object key = "products/{id}-{sanitized-filename}.{ext}". Provider-
        // agnostic; no filesystem semantics baked in.
        String objectKey = "products/" + id + "-" + original;

        // If the buyer already had a bundle uploaded, R2's put replaces it
        // atomically; if the filename changed we also purge the old key so
        // we don't accumulate orphans.
        String previousKey = p.getAssetPath();
        storage.upload(objectKey, file.getInputStream(), file.getSize(),
                file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        if (previousKey != null && !previousKey.equals(objectKey) && looksLikeObjectKey(previousKey)) {
            try { storage.delete(previousKey); }
            catch (IOException e) { log.warn("Could not delete previous asset {}: {}", previousKey, e.getMessage()); }
        }

        p.setAssetPath(objectKey);
        int mb = (int) Math.max(1, Math.round(file.getSize() / 1024.0 / 1024.0));
        p.setFileSizeMb(mb);
        products.save(p);

        log.info("Uploaded {} bytes to storage key {} for product #{}", file.getSize(), objectKey, id);
        return ResponseEntity.ok(Map.of(
                "ok",         true,
                "fileName",   original,
                "fileSizeMb", mb
        ));
    }

    @DeleteMapping
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    public ResponseEntity<?> remove(@PathVariable Long id) throws IOException {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));
        String key = p.getAssetPath();
        if (key != null) {
            if (looksLikeObjectKey(key)) {
                try { storage.delete(key); }
                catch (IOException e) { log.warn("Could not delete asset {}: {}", key, e.getMessage()); }
            }
            p.setAssetPath(null);
            products.save(p);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<?> preview(@PathVariable Long id) throws IOException {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));
        String key = p.getAssetPath();
        if (key == null || !looksLikeObjectKey(key) || !storage.exists(key)) {
            return ResponseEntity.notFound().build();
        }
        String displayName = key.substring(key.lastIndexOf('/') + 1);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + displayName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(storage.openStream(key)));
    }

    /** Strip path separators and exotic characters from user-supplied filenames. */
    private static String sanitise(String name) {
        if (name == null || name.isBlank()) return "upload.bin";
        String clean = name.replaceAll("[^A-Za-z0-9._-]", "_");
        // Collapse leading dots so ".." can't survive → "_".
        clean = clean.replaceAll("^\\.+", "_");
        if (clean.isEmpty()) clean = "upload.bin";
        return clean.toLowerCase(Locale.ROOT);
    }

    /** Lower-cased extension including the dot, or "" if none. */
    private static String extensionOf(String filename) {
        int i = filename.lastIndexOf('.');
        return i < 0 ? "" : filename.substring(i).toLowerCase(Locale.ROOT);
    }

    /**
     * Legacy rows written before the R2 migration hold absolute filesystem
     * paths in {@code assetPath}. Those are useless once the disk is wiped;
     * we don't try to read from them and we don't try to delete them either
     * (they're not our concern once the row is re-uploaded). This helper
     * distinguishes new-style object keys from old-style FS paths.
     */
    static boolean looksLikeObjectKey(String value) {
        return value != null && !value.startsWith("/") && !value.contains(":");
    }
}
