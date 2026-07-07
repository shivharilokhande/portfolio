package com.personal.portfolio.store;

import java.math.BigDecimal;
import java.util.List;

/** Public representation of a Product. Asset paths NEVER leak to the client. */
public record ProductDto(
        Long         id,
        String       slug,
        String       title,
        String       tagline,
        String       description,
        String       category,
        BigDecimal   priceInr,
        BigDecimal   priceUsd,
        String       coverColor,
        List<String> tags,
        Integer      fileSizeMb,
        String       version,
        String       demoUrl,
        String       repoUrl,
        List<String> features,
        List<String> whatYouGet,
        List<String> techStack,
        boolean      featured,
        boolean      published,
        /** URLs (relative to the API host) the client can render as an <img src>. */
        List<String> demoImages
) {
    public static ProductDto from(Product p) {
        List<String> imgUrls = p.demoImageList().stream()
                .map(name -> "/api/store/products/" + p.getId() + "/images/" + name)
                .toList();
        return new ProductDto(
                p.getId(), p.getSlug(), p.getTitle(), p.getTagline(), p.getDescription(),
                p.getCategory(), p.getPriceInr(), p.getPriceUsd(), p.getCoverColor(),
                p.tagList(), p.getFileSizeMb(), p.getVersion(),
                p.getDemoUrl(), p.getRepoUrl(),
                p.featureList(), p.whatYouGet(), p.techStackList(),
                Boolean.TRUE.equals(p.getFeatured()),
                Boolean.TRUE.equals(p.getPublished()),
                imgUrls);
    }
}
