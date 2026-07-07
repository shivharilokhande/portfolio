package com.personal.portfolio.projects;

import java.util.List;

/** Public projection of a Project — what we send to the frontend. */
public record ProjectDto(
        Long         id,
        String       slug,
        String       title,
        String       blurb,
        String       metric,
        List<String> stack,
        String       accent,
        String       repoUrl,
        String       demoUrl,
        boolean      featured
) {
    public static ProjectDto from(Project p) {
        return new ProjectDto(
                p.getId(), p.getSlug(), p.getTitle(), p.getBlurb(), p.getMetric(),
                p.stackAsList(), p.getAccent(), p.getRepoUrl(), p.getDemoUrl(),
                Boolean.TRUE.equals(p.getFeatured()));
    }
}
