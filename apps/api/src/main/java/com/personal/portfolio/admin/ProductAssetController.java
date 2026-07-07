package com.personal.portfolio.admin;

import com.personal.portfolio.store.Product;
import com.personal.portfolio.store.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

/**
 * Admin-only digital-asset uploads.
 *
 *   POST   /api/admin/products/{id}/asset     — multipart upload (ZIP / TGZ / 7Z)
 *   DELETE /api/admin/products/{id}/asset     — wipe the stored file
 *   GET    /api/admin/products/{id}/asset     — preview / download from admin
 *
 *   Saved to {app.storage.base-path}/products/{id}-{originalFilename}
 *   The Product.asset_path column stores the full filesystem path.
 *   In production swap save() to write to S3 and store the key instead.
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
    private final Path baseDir;

    public ProductAssetController(
            ProductRepository products,
            @Value("${app.storage.base-path}") String basePath) throws IOException {
        this.products = products;
        // Absolute + normalised so `path.startsWith(baseDir)` traversal guards
        // downstream match peer controllers (ProductImage, Download, ProfileAsset).
        this.baseDir = Path.of(basePath, "products").toAbsolutePath().normalize();
        Files.createDirectories(this.baseDir);
        log.info("Product asset storage: {}", this.baseDir);
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

        // Ensure resolved target stays inside baseDir even if sanitisation misses something.
        Path target = baseDir.resolve(id + "-" + original).normalize();
        if (!target.startsWith(baseDir)) {
            return ResponseEntity.badRequest().body(Map.of("error", "bad_filename"));
        }
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        p.setAssetPath(target.toAbsolutePath().toString());
        // Update reported file size in MB
        int mb = (int) Math.max(1, Math.round(Files.size(target) / 1024.0 / 1024.0));
        p.setFileSizeMb(mb);
        products.save(p);

        log.info("Uploaded {} bytes to {} for product #{}", Files.size(target), target, id);
        // NOTE: do not leak the absolute server path in the response.
        return ResponseEntity.ok(Map.of(
                "ok",         true,
                "fileName",   target.getFileName().toString(),
                "fileSizeMb", mb
        ));
    }

    @DeleteMapping
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    public ResponseEntity<?> remove(@PathVariable Long id) throws IOException {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));
        if (p.getAssetPath() != null) {
            Path path = Path.of(p.getAssetPath()).toAbsolutePath().normalize();
            // Only delete files inside baseDir — no arbitrary FS deletes.
            if (path.startsWith(baseDir)) {
                try { Files.deleteIfExists(path); } catch (IOException ignored) {}
            }
            p.setAssetPath(null);
            products.save(p);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<?> preview(@PathVariable Long id) {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));
        if (p.getAssetPath() == null) return ResponseEntity.notFound().build();
        Path path = Path.of(p.getAssetPath()).toAbsolutePath().normalize();
        // Path-traversal guard — asset must live inside the configured base dir.
        if (!path.startsWith(baseDir) || !Files.exists(path)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + path.getFileName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new FileSystemResource(path));
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
}
