package com.personal.portfolio.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Enables Spring's caching abstraction. Cache provider (Caffeine) and the
 * actual cache definitions are configured declaratively in application.yml
 * under spring.cache.*.
 *
 *   - cache "products"           → list of all published products (TTL 2m)
 *   - cache "productBySlug"      → single product lookup
 *   - cache "portfolioSections"  → CMS section bodies for the public site
 *
 * @CacheEvict on admin mutations (create/update/delete) keeps the cache fresh.
 */
@Configuration
@EnableCaching
public class CacheConfig { }
