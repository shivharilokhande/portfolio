package com.personal.portfolio.admin;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Gates everything under /api/admin/** behind a valid admin session token
 * passed via the Authorization: Bearer <token> header.
 *
 * The login endpoint itself (/api/admin/login) is intentionally NOT gated.
 */
@Component
public class AdminAuthFilter extends OncePerRequestFilter {

    private final AdminAuth auth;

    public AdminAuthFilter(AdminAuth auth) { this.auth = auth; }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String path = req.getRequestURI();
        if (!path.startsWith("/api/admin/")) { chain.doFilter(req, res); return; }
        if (path.equals("/api/admin/login")) { chain.doFilter(req, res); return; }
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) { chain.doFilter(req, res); return; }

        String header = req.getHeader("Authorization");
        String token  = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;

        if (!auth.validate(token)) {
            res.setStatus(401);
            res.setContentType("application/json");
            res.getWriter().write("""
                {"error":"unauthorized","message":"Admin session missing or expired."}""");
            return;
        }
        chain.doFilter(req, res);
    }
}
