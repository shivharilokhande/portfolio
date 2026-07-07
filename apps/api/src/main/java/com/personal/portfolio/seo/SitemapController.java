package com.personal.portfolio.seo;

import com.personal.portfolio.config.AppSettings;
import com.personal.portfolio.store.Product;
import com.personal.portfolio.store.ProductRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Serves /sitemap.xml dynamically so buyers of the template don't have to
 * hand-edit a static file with their own domain. The base URL comes from
 * the admin-configurable {@code site.baseUrl} setting, and falls back to the
 * host on the incoming request when the setting is blank.
 *
 * <p>Includes the primary portfolio anchors + every published product's
 * detail page. Blog posts are omitted here — add them once the blog is
 * wired to a public listing.
 */
@RestController
public class SitemapController {

    private final AppSettings settings;
    private final ProductRepository products;

    public SitemapController(AppSettings settings, ProductRepository products) {
        this.settings = settings;
        this.products = products;
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<String> sitemap(HttpServletRequest req) {
        String base = deriveBaseUrl(req);
        Instant now = Instant.now();
        StringBuilder sb = new StringBuilder(2048);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        addUrl(sb, base + "/",           "weekly",  "1.0", now);
        addUrl(sb, base + "/#about",     "monthly", "0.6", now);
        addUrl(sb, base + "/#skills",    "monthly", "0.6", now);
        addUrl(sb, base + "/#projects",  "monthly", "0.7", now);
        addUrl(sb, base + "/#services",  "monthly", "0.6", now);
        addUrl(sb, base + "/#contact",   "monthly", "0.8", now);
        addUrl(sb, base + "/store",      "weekly",  "0.9", now);
        addUrl(sb, base + "/blog",       "weekly",  "0.7", now);

        // Product detail pages — only published catalogue items.
        List<Product> live = products.findAllByPublishedTrueOrderByFeaturedDescIdAsc();
        for (Product p : live) {
            if (p.getSlug() == null || p.getSlug().isBlank()) continue;
            addUrl(sb, base + "/store/" + p.getSlug(), "weekly", "0.7", now);
        }

        sb.append("</urlset>\n");

        return ResponseEntity.ok()
                // 1h cache — sitemaps don't need to be second-fresh.
                .header("Cache-Control", "public, max-age=3600")
                .body(sb.toString());
    }

    /**
     * Resolve the base URL used for absolute links. Priority:
     *   1. `site.baseUrl` admin setting (recommended in prod)
     *   2. The scheme + host of the incoming request (dev / non-proxy)
     * Trailing slashes are stripped so we don't emit `//path`.
     */
    private String deriveBaseUrl(HttpServletRequest req) {
        String cfg = settings.siteBaseUrl();
        if (cfg != null && !cfg.isBlank()) return trimSlash(cfg.trim());
        // Fall back to whatever host served this request.
        String scheme = req.getScheme();
        String host   = req.getHeader("Host");
        if (host == null || host.isBlank()) host = req.getServerName();
        return trimSlash(scheme + "://" + host);
    }

    private static String trimSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static void addUrl(StringBuilder sb, String loc, String changefreq,
                               String priority, Instant lastmod) {
        sb.append("  <url>\n");
        sb.append("    <loc>").append(xmlEscape(loc)).append("</loc>\n");
        sb.append("    <lastmod>").append(lastmod).append("</lastmod>\n");
        sb.append("    <changefreq>").append(changefreq).append("</changefreq>\n");
        sb.append("    <priority>").append(priority).append("</priority>\n");
        sb.append("  </url>\n");
    }

    private static String xmlEscape(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
