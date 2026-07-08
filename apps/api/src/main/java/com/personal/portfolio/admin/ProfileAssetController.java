package com.personal.portfolio.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.personal.portfolio.cms.PortfolioContent;
import com.personal.portfolio.cms.PortfolioContentRepository;
import com.personal.portfolio.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Admin CV upload + public CV download.
 *
 * <pre>
 *   POST   /api/admin/profile/cv         — multipart PDF (≤ 10 MB), overwrites the current CV
 *   DELETE /api/admin/profile/cv         — remove the current CV
 *   GET    /api/admin/profile/cv/status  — { exists, updatedAt } for the admin UI
 *   GET    /api/profile/cv               — public download (streams from storage)
 * </pre>
 *
 * <p>Storage key: {@code profile/cv.pdf} (single file, latest wins). We
 * still stream through this controller on the public endpoint instead of
 * redirecting to R2 — sets the {@code Content-Disposition} header so the
 * file lands on disk with a nice name, avoids exposing the R2 URL in the
 * &lt;a&gt; tag, and the file is small enough (≤10 MB) that the extra
 * hop is fine.
 *
 * <p>Side effect on upload/delete: patches
 * {@code portfolio_content.profile.body.cvUrl} so the public Hero button
 * auto-updates via the existing CMS live sync.
 */
@RestController
public class ProfileAssetController {

    private static final Logger log = LoggerFactory.getLogger(ProfileAssetController.class);
    private static final long MAX_BYTES = 10L * 1024 * 1024;
    private static final String PROFILE_KEY = "profile";
    private static final String CV_OBJECT_KEY = "profile/cv.pdf";

    private final PortfolioContentRepository profiles;
    private final ObjectMapper mapper;
    private final StorageService storage;

    public ProfileAssetController(PortfolioContentRepository profiles,
                                  ObjectMapper mapper,
                                  StorageService storage) {
        this.profiles = profiles;
        this.mapper   = mapper;
        this.storage  = storage;
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

        storage.upload(CV_OBJECT_KEY, file.getInputStream(), file.getSize(), "application/pdf");

        // Append a cache-busting version so browsers pick up new uploads
        // immediately even when a CDN caches /api/profile/cv.
        String url = "/api/profile/cv?v=" + Instant.now().toEpochMilli();
        patchProfileCvUrl(url);

        log.info("Uploaded CV ({} bytes) to storage key {}", file.getSize(), CV_OBJECT_KEY);
        return ResponseEntity.ok(Map.of(
                "ok",         true,
                "url",        url,
                "sizeBytes",  file.getSize()));
    }

    @DeleteMapping("/api/admin/profile/cv")
    @Transactional
    public ResponseEntity<?> remove() throws IOException {
        try { storage.delete(CV_OBJECT_KEY); }
        catch (IOException e) { log.warn("Could not delete CV from storage: {}", e.getMessage()); }
        patchProfileCvUrl("");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/api/admin/profile/cv/status")
    public Map<String, Object> status() throws IOException {
        Map<String, Object> out = new HashMap<>();
        long size = storage.size(CV_OBJECT_KEY);
        boolean exists = size >= 0;
        out.put("exists", exists);
        if (exists) {
            out.put("sizeBytes", size);
            // R2 exposes LastModified via HEAD but the size() method returns
            // just the length; a fuller status probe could pull the head
            // response directly. For the admin UI, size is enough — the
            // updatedAt column shown to the user is fine to derive from the
            // CMS profile row's updatedAt instead.
        }
        return out;
    }

    /* ---------- Public ---------- */

    /**
     * Public CV download. Streams from storage with a friendly filename.
     * The file is small (≤10 MB) so hopping through Spring is fine — this
     * lets us set {@code Content-Disposition} cleanly regardless of what
     * the storage backend sets on the underlying object, and avoids
     * leaking the raw R2 URL in the browser's Network tab.
     */
    @GetMapping("/api/profile/cv")
    public ResponseEntity<?> download() throws IOException {
        if (!storage.exists(CV_OBJECT_KEY)) return ResponseEntity.notFound().build();
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_PDF);
        h.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"cv.pdf\"");
        h.setCacheControl("no-cache");
        return ResponseEntity.ok().headers(h).body(new InputStreamResource(storage.openStream(CV_OBJECT_KEY)));
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
