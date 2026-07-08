package com.personal.portfolio.storage;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;

/**
 * Object storage abstraction. Two implementations are provided:
 *
 * <ul>
 *   <li>{@link R2StorageService} — Cloudflare R2 (S3-compatible). The
 *       production choice. Objects survive container restarts, presigned
 *       URLs let paid downloads bypass our server after the auth check.</li>
 *   <li>{@link LocalStorageService} — writes to the local filesystem.
 *       Kept for dev + tests + hosts with a persistent volume mounted.</li>
 * </ul>
 *
 * <p>Which impl is active is decided at boot in {@code StorageConfig} based on
 * whether {@code app.storage.provider} is {@code r2} or {@code local}
 * (defaults to {@code local} so unconfigured dev environments still work).
 *
 * <h3>Object-key conventions</h3>
 *
 * The bucket is a flat namespace but we prefix keys to keep things tidy:
 * <pre>
 *   products/{productId}-{sanitizedFilename}       — paid ZIP bundles
 *   product-images/{productId}/{uuidFilename}      — demo screenshots (public)
 *   profile/cv.pdf                                 — the site owner's CV (public)
 * </pre>
 *
 * These prefixes are enforced by the calling controllers, not by this
 * interface — the interface just moves bytes.
 */
public interface StorageService {

    /**
     * Uploads bytes to the given key, replacing any existing object at that
     * key. Never returns null. Throws IOException on network/permission errors.
     *
     * @param objectKey full object key, e.g. {@code "products/42-bundle.zip"}
     * @param input source stream — the impl must close it
     * @param contentLength known byte length; required by S3 (no chunked
     *                      transfer to R2)
     * @param contentType MIME type stored on the object so downloads carry
     *                    the right header
     */
    void upload(String objectKey, InputStream input, long contentLength, String contentType) throws IOException;

    /** Idempotent delete. No-op if the key isn't present. */
    void delete(String objectKey) throws IOException;

    /** {@code true} iff the object exists in the bucket. */
    boolean exists(String objectKey) throws IOException;

    /** Object size in bytes, or {@code -1} if the object is missing. */
    long size(String objectKey) throws IOException;

    /**
     * Direct, unauthenticated URL for public content (images, CV). For R2 this
     * is the {@code pub-*.r2.dev} URL (or the custom domain if configured);
     * for the local impl this is the app-served {@code /api/…/} path that
     * already exists. Never returns null.
     */
    String publicUrl(String objectKey);

    /**
     * Short-lived signed URL for paid content. The buyer's browser is
     * redirected here after the app validates their download token, so the
     * bytes never flow through our Spring instance. TTLs of 30-300 seconds
     * are typical — long enough for a slow retry, short enough that a
     * scraped URL is useless a minute later.
     */
    String presignedGetUrl(String objectKey, Duration ttl);

    /**
     * Opens a stream for server-side reads (admin download-a-copy, etc.). The
     * caller must close the stream. For R2 this fetches over HTTPS; for the
     * local impl this is a plain FileInputStream. IOException on missing.
     */
    InputStream openStream(String objectKey) throws IOException;
}
