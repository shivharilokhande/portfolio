package com.personal.portfolio.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;

/**
 * Wires up the active {@link StorageService} at boot.
 *
 * <p>Provider selection is driven by {@code app.storage.provider}:
 * <ul>
 *   <li>{@code r2}   — Cloudflare R2 (production). Requires all four R2
 *       properties to be non-blank; falls back to local + warns loudly
 *       if any are missing, so a mis-configured prod boot doesn't silently
 *       corrupt data.</li>
 *   <li>{@code local} (default) — filesystem under {@code app.storage.base-path}.</li>
 * </ul>
 *
 * <p>The S3 client + presigner are singletons (they carry an HTTP connection
 * pool). They're only built when the provider is actually R2 to avoid
 * DNS/socket work in dev.
 */
@Configuration
public class StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    public StorageService storageService(
            @Value("${app.storage.provider:local}") String provider,
            @Value("${app.storage.base-path:./.storage}") String basePath,
            @Value("${app.storage.r2.endpoint:}") String r2Endpoint,
            @Value("${app.storage.r2.access-key-id:}") String r2AccessKey,
            @Value("${app.storage.r2.secret-access-key:}") String r2SecretKey,
            @Value("${app.storage.r2.bucket:}") String r2Bucket,
            @Value("${app.storage.r2.public-url-base:}") String r2PublicUrl
    ) throws IOException {

        boolean wantsR2 = "r2".equalsIgnoreCase(provider);
        boolean r2Complete = !isBlank(r2Endpoint) && !isBlank(r2AccessKey)
                && !isBlank(r2SecretKey) && !isBlank(r2Bucket);

        if (wantsR2 && !r2Complete) {
            // We do NOT silently downgrade to local — losing uploaded files
            // in prod because an env var got dropped is a nightmare. Fail
            // loudly so the operator notices during deploy verification.
            throw new IllegalStateException(
                    "app.storage.provider=r2 but one of "
                            + "[endpoint, access-key-id, secret-access-key, bucket] is blank. "
                            + "Refusing to boot with mismatched storage config.");
        }

        if (wantsR2) {
            log.info("Storage: Cloudflare R2 at {} bucket={}", r2Endpoint, r2Bucket);
            AwsBasicCredentials creds = AwsBasicCredentials.create(r2AccessKey, r2SecretKey);
            var credProvider = StaticCredentialsProvider.create(creds);

            // Region is required by the SDK; R2 ignores it but rejects an
            // empty string. `auto` is what the R2 docs recommend.
            Region region = Region.of("auto");

            // Path-style access is friendlier for arbitrary custom domains;
            // R2 accepts both, so we default to path-style to avoid needing
            // to configure DNS for virtual-hosted style.
            S3Configuration s3Cfg = S3Configuration.builder()
                    .pathStyleAccessEnabled(true)
                    .build();

            S3Client s3 = S3Client.builder()
                    .endpointOverride(URI.create(r2Endpoint))
                    .region(region)
                    .credentialsProvider(credProvider)
                    .serviceConfiguration(s3Cfg)
                    .build();

            S3Presigner presigner = S3Presigner.builder()
                    .endpointOverride(URI.create(r2Endpoint))
                    .region(region)
                    .credentialsProvider(credProvider)
                    .serviceConfiguration(s3Cfg)
                    .build();

            return new R2StorageService(s3, presigner, r2Bucket, r2PublicUrl);
        }

        log.info("Storage: local filesystem at {}", basePath);
        return new LocalStorageService(Path.of(basePath));
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }
}
