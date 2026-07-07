package com.personal.portfolio.blog;

import java.time.Instant;

/** Compact card representation for the blog index. */
public record BlogPostSummaryDto(
        Long    id,
        String  slug,
        String  title,
        String  excerpt,
        String  category,
        Integer readMin,
        Instant publishedAt
) {
    public static BlogPostSummaryDto from(BlogPost p) {
        return new BlogPostSummaryDto(
                p.getId(), p.getSlug(), p.getTitle(), p.getExcerpt(),
                p.getCategory(), p.getReadMin(), p.getPublishedAt());
    }
}
