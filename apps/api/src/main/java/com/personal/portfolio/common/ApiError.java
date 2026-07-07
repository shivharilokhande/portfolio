package com.personal.portfolio.common;

import java.time.Instant;
import java.util.List;

/** Uniform error envelope returned from every non-2xx response. */
public record ApiError(
        String       error,
        String       message,
        List<String> details,
        Instant      timestamp,
        String       path
) {
    public static ApiError of(String error, String message, String path) {
        return new ApiError(error, message, List.of(), Instant.now(), path);
    }

    public static ApiError of(String error, String message, List<String> details, String path) {
        return new ApiError(error, message, details, Instant.now(), path);
    }
}
