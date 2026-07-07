package com.personal.portfolio.admin;

import com.personal.portfolio.contact.ContactRepository;
import com.personal.portfolio.contact.ContactSubmission;
import com.personal.portfolio.store.Order;
import com.personal.portfolio.store.OrderRepository;
import com.personal.portfolio.store.OrderResponse;
import com.personal.portfolio.store.Product;
import com.personal.portfolio.store.ProductDto;
import com.personal.portfolio.store.ProductRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Admin REST API — gated by AdminAuthFilter.
 *
 *   POST   /api/admin/login                — get session token
 *   POST   /api/admin/logout
 *   GET    /api/admin/stats                — top-level dashboard counters
 *   GET    /api/admin/orders               — list orders (newest first)
 *   GET    /api/admin/contacts             — list contact submissions
 *   GET    /api/admin/products             — list all products (incl. unpublished)
 *   POST   /api/admin/products             — create new product
 *   PUT    /api/admin/products/{id}        — update existing product
 *   DELETE /api/admin/products/{id}        — delete product
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record LoginResponse(String token, String email, long expiresInMin) {}
    public record AdminStats(
            long totalProducts,
            long publishedProducts,
            long totalOrders,
            long paidOrders,
            BigDecimal totalRevenueInr,
            long totalContacts,
            long newContacts) {}
    /**
     * Payload for create + update. `slug`, `title` and `priceInr` are the
     * three NOT NULL columns on `product`; if they're blank on create the
     * JPA save would surface as a raw 500 without validation. Update calls
     * that supply null for these fields simply skip the setter (see
     * applyToEntity) — the @NotBlank guard fires only when a non-null blank
     * is passed, which is still the right behaviour (the client meant to
     * clear a required column).
     */
    public record AdminProductRequest(
            @NotBlank(groups = OnCreate.class) String slug,
            @NotBlank(groups = OnCreate.class) String title,
            String tagline, String description, String category,
            @jakarta.validation.constraints.NotNull(groups = OnCreate.class)
            @jakarta.validation.constraints.DecimalMin(value = "0.00", inclusive = true)
            BigDecimal priceInr,
            @jakarta.validation.constraints.DecimalMin(value = "0.00", inclusive = true)
            BigDecimal priceUsd, String coverColor,
            String tags, String features, String whatYouGet, String techStack,
            Integer fileSizeMb, String version, String demoUrl, String repoUrl,
            String assetPath, Boolean featured, Boolean published) {}

    /** Validation group — only enforced on POST /products. On PUT (partial
     *  update) we accept null values and skip the field. */
    public interface OnCreate {}

    private final AdminAuth auth;
    private final ProductRepository products;
    private final OrderRepository   orders;
    private final ContactRepository contacts;

    public AdminController(AdminAuth auth, ProductRepository products,
                           OrderRepository orders, ContactRepository contacts) {
        this.auth     = auth;
        this.products = products;
        this.orders   = orders;
        this.contacts = contacts;
    }

    /* ---------- Auth ---------- */

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        String token = auth.login(req.email(), req.password());
        if (token == null) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "invalid_credentials",
                            "message", "Email or password is incorrect."));
        }
        return ResponseEntity.ok(new LoginResponse(token, auth.adminEmail(), 8 * 60));
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@RequestHeader(value = "Authorization", required = false) String header) {
        if (header != null && header.startsWith("Bearer ")) auth.logout(header.substring(7));
        return Map.of("status", "ok");
    }

    /* ---------- Dashboard stats ---------- */

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public AdminStats stats() {
        long totalProducts     = products.count();
        long publishedProducts = products.countByPublishedTrue();
        long totalOrders       = orders.count();
        long paidOrders        = orders.countByStatus(Order.Status.PAID);
        BigDecimal revenue     = orders.sumTotalByStatusAndCurrency(Order.Status.PAID, "INR");
        if (revenue == null) revenue = BigDecimal.ZERO;
        long totalContacts     = contacts.count();
        long newContacts       = contacts.countByStatus(ContactSubmission.Status.NEW);
        return new AdminStats(totalProducts, publishedProducts,
                totalOrders, paidOrders, revenue, totalContacts, newContacts);
    }

    /* ---------- Orders ---------- */

    public record OrderStatusRequest(@NotBlank String status) {}

    @GetMapping("/orders")
    @Transactional(readOnly = true) // needed: lazy items + open-in-view=false
    public List<OrderResponse> listOrders(@RequestParam(defaultValue = "50") int limit) {
        var page = orders.findAll(PageRequest.of(0, Math.min(limit, 200),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        return page.stream().map(o -> OrderResponse.from(o, null)).toList();
    }

    /** Mark an order as PAID / CANCELLED / REFUNDED from the admin UI. */
    @PutMapping("/orders/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable Long id, @Valid @RequestBody OrderStatusRequest req) {
        var order = orders.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Order " + id + " not found"));
        Order.Status next;
        try { next = Order.Status.valueOf(req.status().toUpperCase()); }
        catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        order.setStatus(next);
        return ResponseEntity.ok(OrderResponse.from(orders.save(order), null));
    }

    /* ---------- Contacts ---------- */

    public record ContactStatusRequest(@NotBlank String status) {}

    /** Trimmed DTO for admin contacts — excludes ipHash / userAgent so the
     *  internal audit-only fields don't leak onto the wire. */
    public record ContactDto(
            Long id, String name, String email, String company,
            String projectType, String message, String status, String createdAt) {
        static ContactDto from(ContactSubmission c) {
            return new ContactDto(
                    c.getId(), c.getName(), c.getEmail(), c.getCompany(),
                    c.getProjectType(), c.getMessage(),
                    c.getStatus() == null ? null : c.getStatus().name(),
                    c.getCreatedAt() == null ? null : c.getCreatedAt().toString());
        }
    }

    @GetMapping("/contacts")
    @Transactional(readOnly = true)
    public List<ContactDto> listContacts(@RequestParam(defaultValue = "50") int limit) {
        var page = contacts.findAll(PageRequest.of(0, Math.min(limit, 200),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        return page.getContent().stream().map(ContactDto::from).toList();
    }

    /** Mark an inquiry as REPLIED / ARCHIVED / SPAM. */
    @PutMapping("/contacts/{id}/status")
    public ResponseEntity<ContactSubmission> updateContactStatus(
            @PathVariable Long id, @Valid @RequestBody ContactStatusRequest req) {
        var c = contacts.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Contact " + id + " not found"));
        ContactSubmission.Status next;
        try { next = ContactSubmission.Status.valueOf(req.status().toUpperCase()); }
        catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        c.setStatus(next);
        return ResponseEntity.ok(contacts.save(c));
    }

    /* ---------- Products CRUD ---------- */

    @GetMapping("/products")
    @Transactional(readOnly = true) // demoImageList() walks a lazy collection
    public List<ProductDto> listProducts() {
        return products.findAll(Sort.by("id")).stream().map(ProductDto::from).toList();
    }

    /** Single product fetch — used by the edit form to hydrate fields. */
    @GetMapping("/products/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProductDto> getProduct(@PathVariable Long id) {
        return products.findById(id)
                .map(ProductDto::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/products")
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    public ProductDto create(@org.springframework.validation.annotation.Validated(OnCreate.class)
                             @RequestBody AdminProductRequest req) {
        Product p = applyToEntity(new Product(), req);
        return ProductDto.from(products.save(p));
    }

    @PutMapping("/products/{id}")
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    public ResponseEntity<ProductDto> update(@PathVariable Long id,
                                             @Valid @RequestBody AdminProductRequest req) {
        Product p = products.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product " + id + " not found"));
        applyToEntity(p, req);
        return ResponseEntity.ok(ProductDto.from(products.save(p)));
    }

    @DeleteMapping("/products/{id}")
    @CacheEvict(value = { "products", "productBySlug" }, allEntries = true)
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!products.existsById(id)) return ResponseEntity.notFound().build();
        products.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private static Product applyToEntity(Product p, AdminProductRequest r) {
        if (r.slug()         != null) p.setSlug(r.slug());
        if (r.title()        != null) p.setTitle(r.title());
        if (r.tagline()      != null) p.setTagline(r.tagline());
        if (r.description()  != null) p.setDescription(r.description());
        if (r.category()     != null) p.setCategory(r.category());
        if (r.priceInr()     != null) p.setPriceInr(r.priceInr());
        if (r.priceUsd()     != null) p.setPriceUsd(r.priceUsd());
        if (r.coverColor()   != null) p.setCoverColor(r.coverColor());
        if (r.tags()         != null) p.setTags(r.tags());
        if (r.features()     != null) p.setFeaturesCsv(r.features());
        if (r.whatYouGet()   != null) p.setWhatYouGetCsv(r.whatYouGet());
        if (r.techStack()    != null) p.setTechStackCsv(r.techStack());
        if (r.fileSizeMb()   != null) p.setFileSizeMb(r.fileSizeMb());
        if (r.version()      != null) p.setVersion(r.version());
        if (r.demoUrl()      != null) p.setDemoUrl(r.demoUrl());
        if (r.repoUrl()      != null) p.setRepoUrl(r.repoUrl());
        if (r.assetPath()    != null) p.setAssetPath(r.assetPath());
        if (r.featured()     != null) p.setFeatured(r.featured());
        if (r.published()    != null) p.setPublished(r.published());
        return p;
    }
}
