package com.personal.portfolio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Central resolver for admin-configurable settings.
 *
 *   Every call reads the current DB value and falls back to the env-var
 *   value from application.yml if the DB row is null/blank. That way the
 *   app still works out of the box, but the admin can override anything
 *   at runtime without a redeploy.
 */
@Service
public class AppSettings {

    private final AppSettingRepository repo;

    // Fallback values from application.yml — used when the DB has no override.
    private final String envNotifyTo;
    private final String envFromAddress;
    private final String envRazorpayKeyId;
    private final String envRazorpayKeySecret;
    private final String envStripeSecretKey;
    private final String envStripeWebhookSecret;
    private final int    envContactPerHour;
    private final int    envApiPerMinute;

    public AppSettings(
            AppSettingRepository repo,
            @Value("${app.contact.notify-to:}")            String envNotifyTo,
            @Value("${app.contact.from:}")                 String envFromAddress,
            @Value("${app.payment.razorpay.key-id:}")      String envRazorpayKeyId,
            @Value("${app.payment.razorpay.key-secret:}")  String envRazorpayKeySecret,
            @Value("${app.payment.stripe.secret-key:}")    String envStripeSecretKey,
            @Value("${app.payment.stripe.webhook-secret:}") String envStripeWebhookSecret,
            @Value("${app.rate-limit.contact-per-hour:5}") int envContactPerHour,
            @Value("${app.rate-limit.api-per-minute:300}") int envApiPerMinute) {
        this.repo = repo;
        this.envNotifyTo            = envNotifyTo;
        this.envFromAddress         = envFromAddress;
        this.envRazorpayKeyId       = envRazorpayKeyId;
        this.envRazorpayKeySecret   = envRazorpayKeySecret;
        this.envStripeSecretKey     = envStripeSecretKey;
        this.envStripeWebhookSecret = envStripeWebhookSecret;
        this.envContactPerHour      = envContactPerHour;
        this.envApiPerMinute        = envApiPerMinute;
    }

    /* ---------- generic ---------- */

    /** DB value if present + non-blank, otherwise the given fallback. */
    public String getString(String key, String fallback) {
        return repo.findById(key)
                .map(AppSetting::getValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(fallback);
    }
    public boolean getBoolean(String key, boolean fallback) {
        return repo.findById(key)
                .map(AppSetting::getValue)
                .filter(v -> v != null && !v.isBlank())
                .map(v -> "true".equalsIgnoreCase(v.trim()) || "1".equals(v.trim()))
                .orElse(fallback);
    }
    public int getInt(String key, int fallback) {
        return repo.findById(key)
                .map(AppSetting::getValue)
                .filter(v -> v != null && !v.isBlank())
                .map(v -> {
                    try { return Integer.parseInt(v.trim()); }
                    catch (NumberFormatException ignored) { return fallback; }
                })
                .orElse(fallback);
    }
    public Optional<String> rawValue(String key) {
        return repo.findById(key).map(AppSetting::getValue);
    }

    /* ---------- notifications ---------- */

    public String notifyToEmail()   { return getString("notifications.notifyTo",    envNotifyTo); }
    public String fromEmail()       { return getString("notifications.fromAddress", envFromAddress); }
    public boolean autoReply()      { return getBoolean("notifications.autoReply",  true); }

    /* ---------- payment ---------- */

    public String razorpayKeyId()       { return getString("payment.razorpay.keyId",       envRazorpayKeyId); }
    public String razorpayKeySecret()   { return getString("payment.razorpay.keySecret",   envRazorpayKeySecret); }
    public String stripeSecretKey()     { return getString("payment.stripe.secretKey",     envStripeSecretKey); }
    public String stripeWebhookSecret() { return getString("payment.stripe.webhookSecret", envStripeWebhookSecret); }
    public String defaultCurrency()     { return getString("payment.defaultCurrency",      "INR"); }
    public boolean paymentTestMode()    { return getBoolean("payment.testMode",            true); }

    /* ---------- site metadata ---------- */

    public String siteTitle()       { return getString("site.title",        "Portfolio"); }
    public String siteDescription() { return getString("site.description",  ""); }
    public String ogImageUrl()      { return getString("site.ogImageUrl",   ""); }
    public String analyticsId()     { return getString("site.analyticsId",  ""); }
    /** Primary origin for absolute URLs (canonical, sitemap). */
    public String siteBaseUrl()     { return getString("site.baseUrl",      ""); }

    /* ---------- features ---------- */

    public boolean storeEnabled()   { return getBoolean("features.storeEnabled",    true); }
    public boolean contactHoneypot(){ return getBoolean("features.contactHoneypot", true); }

    /* ---------- rate limits ---------- */
    /* Read at each request by RateLimitFilter — admin edits take effect for new IPs
     * immediately. Existing per-IP buckets keep their original refill schedule
     * until they're evicted or the process restarts, which is fine at our scale. */

    public int contactPerHour() { return getInt("rateLimit.contactPerHour", envContactPerHour); }
    public int apiPerMinute()   { return getInt("rateLimit.apiPerMinute",   envApiPerMinute); }
    public int loginPerMinute() { return getInt("rateLimit.loginPerMinute", 5); }
}
