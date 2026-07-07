package com.personal.portfolio.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.personal.portfolio.cms.PortfolioContent;
import com.personal.portfolio.cms.PortfolioContentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Admin CV upload + public CV download.
 *
 *   POST   /api/admin/profile/cv         — multipart PDF (≤ 10 MB), overwrites the current CV
 *   DELETE /api/admin/profile/cv         — remove the current CV
 *   GET    /api/admin/profile/cv/status  — { exists, updatedAt } for the admin UI
 *   GET    /api/profile/cv               — public download stream (attachment)
 *
 *   Storage: {app.storage.base-path}/profile/cv.pdf   (single file, latest wins)
 *
 *   Side effect: on upload/delete, patches portfolio_content.profile.body.cvUrl
 *   so the public Hero button auto-updates via the existing CMS live sync.
 */
@RestController
public class ProfileAssetController {

    private static final Logger log = LoggerFactory.getLogger(ProfileAssetController.class);
    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final String PROFILE_KEY = "profile";
    private static final String CV_FILENAME = "cv.pdf";

    private final PortfolioContentRepository profiles;
    private final ObjectMapper mapper;
    private final Path baseDir;

    public ProfileAssetController(PortfolioContentRepository profiles,
                                  ObjectMapper mapper,
                                  @Value("${app.storage.base-path}") String basePath) throws IOException {
        this.profiles = profiles;
        this.mapper   = mapper;
        this.baseDir  = Path.of(basePath, "profile").toAbsolutePath().normalize();
        Files.createDirectories(this.baseDir);
        log.info("Profile asset storage: {}", this.baseDir);
    }

    /* ---------- Admin ---------- */

    @PostMapping(path = "/api/admin/profile/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> upload(@RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty())             return ResponseEntity.badRequest().body(Map.of("error", "file_empty"));
        if (file.getSize() > MAX_BYTES) return ResponseEntity.status(413).body(Map.of("error", "file_too_large", "limitMb", 10));

        // PDF only. Check both extension and content type (belt + braces).
        String ext = extensionOf(file.getOriginalFilename());
        if (!".pdf".equals(ext)) {
            return ResponseEntity.status(415).body(Map.of(
                    "error",   "unsupported_media_type",
                    "message", "Only PDF files are accepted for the CV."));
        }
        String ct = file.getContentType();
        if (ct != null && !ct.equalsIgnoreCase("application/pdf")) {
            return ResponseEntity.status(415).body(Map.of("error", "unsupported_media_type", "mime", ct));
        }

        Path target = baseDir.resolve(CV_FILENAME).normalize();
        if (!target.startsWith(baseDir)) return ResponseEntity.badRequest().build();

        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        long size = Files.size(target);

        // Update the profile CMS section so useSection('profile').cvUrl points at the served file.
        // Append a cache-busting version so browsers pick up new uploads immediately.
        String url = "/api/profile/cv?v=" + Instant.now().toEpochMilli();
        patchProfileCvUrl(url);

        log.info("Uploaded CV ({} bytes) to {}", size, target);
        return ResponseEntity.ok(Map.of(
                "ok",         true,
                "url",        url,
                "sizeBytes",  size));
    }

    @DeleteMapping("/api/admin/profile/cv")
    @Transactional
    public ResponseEntity<?> remove() throws IOException {
        Path target = baseDir.resolve(CV_FILENAME).normalize();
        if (target.startsWith(baseDir)) {
            try { Files.deleteIfExists(target); } catch (IOException ignored) {}
        }
        patchProfileCvUrl("");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/api/admin/profile/cv/status")
    public Map<String, Object> status() {
        Path target = baseDir.resolve(CV_FILENAME).normalize();
        boolean exists = target.startsWith(baseDir) && Files.exists(target) && Files.isRegularFile(target);
        Map<String, Object> out = new HashMap<>();
        out.put("exists", exists);
        if (exists) {
            try {
                out.put("sizeBytes", Files.size(target));
                out.put("updatedAt", Files.getLastModifiedTime(target).toInstant().toString());
            } catch (IOException ignored) {}
        }
        return out;
    }

    /* ---------- Public ---------- */

    /**
     * Public CV download. Sets Content-Disposition with a `.pdf` filename so
     * the file lands on disk with the correct extension regardless of what
     * the client's <a download> attribute says. The frontend uses a name
     * derived from the profile's shortName ({shortName}-cv.pdf) — but if
     * a client hits this endpoint directly (e.g. from a share link), we
     * still hand them a well-formed filename here.
     */
    @GetMapping("/api/profile/cv")
    public ResponseEntity<?> download() {
        Path target = baseDir.resolve(CV_FILENAME).normalize();
        if (!target.startsWith(baseDir) || !Files.exists(target) || !Files.isRegularFile(target)) {
            return ResponseEntity.notFound().build();
        }
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cv.pdf\"");
        h.setCacheControl("no-cache");
        return ResponseEntity.ok().headers(h).body(new FileSystemResource(target));
    }

    /* ---------- Helpers ---------- */

    /** Merge a new cvUrl into the profile CMS section body without touching other fields. */
    @SuppressWarnings("unchecked")
    private void patchProfileCvUrl(String url) {
        try {
            PortfolioContent profile = profiles.findById(PROFILE_KEY).orElse(null);
            if (profile == null) return;
            Map<String, Object> body;
            String existing = profile.getBody();
            if (existing == null || existing.isBlank()) {
                body = new LinkedHashMap<>();
            } else {
                Object parsed = mapper.readValue(existing, new TypeReference<Object>() {});
                body = parsed instanceof Map ? new LinkedHashMap<>((Map<String, Object>) parsed) : new LinkedHashMap<>();
            }
            body.put("cvUrl", url);
            profile.setBody(mapper.writeValueAsString(body));
            profiles.save(profile);
        } catch (JsonProcessingException e) {
            log.warn("Could not patch profile.cvUrl — profile body isn't valid JSON: {}", e.getMessage());
        }
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        int i = filename.lastIndexOf('.');
        return i < 0 ? "" : filename.substring(i).toLowerCase(Locale.ROOT);
    }
}
