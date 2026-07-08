package com.personal.portfolio.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;

/**
 * Cloudflare R2 implementation of {@link StorageService}. R2 speaks the
 * S3 v4 protocol, so the AWS SDK works unchanged — we just point it at a
 * different endpoint and give it R2 credentials.
 *
 * <p>Configuration (see {@link StorageConfig}):
 * <ul>
 *   <li>{@code app.storage.r2.endpoint} — {@code https://<accountId>.r2.cloudflarestorage.com}</li>
 *   <li>{@code app.storage.r2.access-key-id}</li>
 *   <li>{@code app.storage.r2.secret-access-key}</li>
 *   <li>{@code app.storage.r2.bucket}</li>
 *   <li>{@code app.storage.r2.public-url-base} — the {@code pub-*.r2.dev}
 *       URL (or a custom domain), used to build public image URLs</li>
 * </ul>
 *
 * <p>The {@link S3Client} and {@link S3Presigner} are injected — they're
 * expensive to construct (HTTP client pool, credential provider chain, etc.)
 * so we build them once at boot in the config class.
 *
 * <p>Note on region: R2 doesn't have regions in the AWS sense but the SDK
 * requires one to be set. We use {@code auto} which is what the R2 docs
 * suggest; the actual endpoint URL is what determines routing.
 */
public class R2StorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(R2StorageService.class);

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucket;
    private final String publicUrlBase;

    public R2StorageService(S3Client s3, S3Presigner presigner, String bucket, String publicUrlBase) {
        this.s3            = s3;
        this.presigner     = presigner;
        this.bucket        = bucket;
        // Trim any trailing slash so publicUrl can concat with '/' cleanly.
        this.publicUrlBase = publicUrlBase == null ? "" : publicUrlBase.replaceAll("/+$", "");
    }

    @Override
    public void upload(String objectKey, InputStream input, long contentLength, String contentType) throws IOException {
        try (InputStream in = input) {
            PutObjectRequest req = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .contentType(contentType == null || contentType.isBlank()
                            ? "application/octet-stream"
                            : contentType)
                    // Setting Content-Length up front lets S3 stream without
                    // buffering the whole file into memory. R2 rejects
                    // chunked uploads without this.
                    .contentLength(contentLength)
                    .build();
            s3.putObject(req, RequestBody.fromInputStream(in, contentLength));
            log.info("R2 upload OK: {}/{} ({} bytes)", bucket, objectKey, contentLength);
        } catch (RuntimeException ex) {
            // AWS SDK throws unchecked; surface as IOException so controllers
            // can uniformly catch upload failures regardless of provider.
            throw new IOException("R2 upload failed for " + objectKey + ": " + ex.getMessage(), ex);
        }
    }

    @Override
    public void delete(String objectKey) throws IOException {
        try {
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket).key(objectKey).build());
            log.info("R2 delete OK: {}/{}", bucket, objectKey);
        } catch (NoSuchKeyException ignored) {
            // Idempotent — S3 typically returns 204 whether the key existed
            // or not, but some S3-compatible impls throw NoSuchKey.
        } catch (RuntimeException ex) {
            throw new IOException("R2 delete failed for " + objectKey + ": " + ex.getMessage(), ex);
        }
    }

    @Override
    public boolean exists(String objectKey) throws IOException {
        try {
            s3.headObject(HeadObjectRequest.builder()
                    .bucket(bucket).key(objectKey).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (RuntimeException ex) {
            throw new IOException("R2 head failed for " + objectKey + ": " + ex.getMessage(), ex);
        }
    }

    @Override
    public long size(String objectKey) throws IOException {
        try {
            var resp = s3.headObject(HeadObjectRequest.builder()
                    .bucket(bucket).key(objectKey).build());
            Long len = resp.contentLength();
            return len == null ? -1 : len;
        } catch (NoSuchKeyException e) {
            return -1;
        } catch (RuntimeException ex) {
            throw new IOException("R2 head failed for " + objectKey + ": " + ex.getMessage(), ex);
        }
    }

    @Override
    public String publicUrl(String objectKey) {
        // If no public base is configured, fall back to a same-origin app
        // path. That path won't actually serve the file from R2 (there is no
        // proxy endpoint), but it prevents NPEs during dev and makes the
        // misconfiguration visible in the UI.
        if (publicUrlBase.isEmpty()) {
            return "/api/storage-not-configured/" + objectKey;
        }
        return publicUrlBase + "/" + objectKey;
    }

    @Override
    public String presignedGetUrl(String objectKey, Duration ttl) {
        GetObjectRequest getReq = GetObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build();
        GetObjectPresignRequest presign = GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(getReq)
                .build();
        return presigner.presignGetObject(presign).url().toString();
    }

    @Override
    public InputStream openStream(String objectKey) throws IOException {
        try {
            return s3.getObject(GetObjectRequest.builder()
                            .bucket(bucket).key(objectKey).build(),
                    ResponseTransformer.toInputStream());
        } catch (NoSuchKeyException e) {
            throw new IOException("R2 object not found: " + objectKey);
        } catch (RuntimeException ex) {
            throw new IOException("R2 get failed for " + objectKey + ": " + ex.getMessage(), ex);
        }
    }
}
