package com.personal.portfolio.store;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 *   GET /api/store/products            — list all published products (cached 2m)
 *   GET /api/store/products/{slug}     — one product (cached by slug)
 *
 *  Cache eviction happens on admin mutations (see AdminController).
 */
@RestController
@RequestMapping("/api/store/products")
public class ProductController {

    private final ProductRepository repo;

    public ProductController(ProductRepository repo) { this.repo = repo; }

    @GetMapping
    @Cacheable("products")
    public List<ProductDto> list() {
        return repo.findAllByPublishedTrueOrderByFeaturedDescIdAsc()
                .stream().map(ProductDto::from).toList();
    }

    @GetMapping("/{slug}")
    @Cacheable(value = "productBySlug", key = "#slug")
    public ResponseEntity<ProductDto> one(@PathVariable String slug) {
        return repo.findBySlugAndPublishedTrue(slug)
                .map(ProductDto::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
