package com.personal.portfolio.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

/**
 * Filesystem-backed {@link StorageService}. The default when
 * {@code app.storage.provider} is unset or {@code local} — used in local
 * development, tests, and any host with a persistent volume mounted (VPS
 * with disk, Docker with a named volume, Render Starter+ tier).
 *
 * <p>Files land under {@code app.storage.base-path} (default {@code ./.storage}),
 * so a key like {@code "products/42-bundle.zip"} writes to
 * {@code ./.storage/products/42-bundle.zip}. This mirrors the layout that
 * the pre-migration controllers used, so on-disk artefacts stay usable if
 * an installation switches back and forth.
 *
 * <p>{@link #publicUrl(String)} returns a path relative to the API host —
 * callers must have a controller that actually serves those bytes. In this
 * project that's {@code ProductImageController#serve} and
 * {@code ProfileAssetController#downloadCv}. {@link #presignedGetUrl} does
 * NOT actually presign anything (no crypto involved); it returns an
 * app-served path with a short-lived query token would be nice-to-have,
 * but for local dev the plain URL is fine.
 */
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path root;

    public LocalStorageService(Path root) throws IOException {
        this.root = root.toAbsolutePath().normalize();
        Files.createDirectories(this.root);
        log.info("LocalStorageService rooted at {}", this.root);
    }

    /** Resolves the object key against the root while blocking path traversal. */
    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("path traversal blocked: " + key);
        }
        return p;
    }

    @Override
    public void upload(String key, InputStream input, long contentLength, String contentType) throws IOException {
        Path target = resolve(key);
        // getParent() can be null for a key at the bucket root (unusual with
        // our current callers, but defend against it — a null argument to
        // createDirectories would NPE).
        Path parent = target.getParent();
        if (parent != null) Files.createDirectories(parent);
        try (InputStream in = input) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        log.info("local upload OK: {} ({} bytes)", target, Files.size(target));
    }

    @Override
    public void delete(String key) throws IOException {
        Path p = resolve(key);
        Files.deleteIfExists(p);
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(resolve(key));
    }

    @Override
    public long size(String key) throws IOException {
        Path p = resolve(key);
        return Files.exists(p) ? Files.size(p) : -1L;
    }

    @Override
    public String publicUrl(String key) {
        // Served by the app itself (there's no CDN in dev). The path shape
        // matches what the pre-migration controllers exposed.
        if (key.startsWith("product-images/")) {
            // "product-images/42/foo.png" -> "/api/store/products/42/images/foo.png"
            String rest = key.substring("product-images/".length());
            int slash = rest.indexOf('/');
            if (slash > 0) {
                return "/api/store/products/" + rest.substring(0, slash)
                        + "/images/" + rest.substring(slash + 1);
            }
        }
        if (key.equals("profile/cv.pdf")) {
            return "/api/profile/cv";
        }
        // Fallback — caller decides how to expose it.
        return "/api/storage/" + key;
    }

    @Override
    public String presignedGetUrl(String key, Duration ttl) {
        // No crypto in the local impl. The Download controller enforces
        // token expiry separately, so a plain app-served URL is sufficient.
        return publicUrl(key);
    }

    @Override
    public InputStream openStream(String key) throws IOException {
        return Files.newInputStream(resolve(key));
    }
}
