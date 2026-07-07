package com.personal.portfolio.blog;

import java.time.Instant;

/** Full blog post (with markdown body) for the detail page. */
public record BlogPostDto(
        Long    id,
        String  slug,
        String  title,
        String  excerpt,
        String  bodyMd,
        String  category,
        Integer readMin,
        Instant publishedAt
) {
    public static BlogPostDto from(BlogPost p) {
        return new BlogPostDto(
                p.getId(), p.getSlug(), p.getTitle(), p.getExcerpt(), p.getBodyMd(),
                p.getCategory(), p.getReadMin(), p.getPublishedAt());
    }
}
