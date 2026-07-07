# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------
# Portfolio API — multi-stage container image.
#
#   Stage 1 (builder): resolve deps + compile fat jar via Maven.
#   Stage 2 (runtime): slim JRE + the fat jar + a non-root user.
#
# Target: Google Cloud Run (512 MiB free tier). JVM is tuned to fit
# the tight memory ceiling. Cloud Run injects PORT=8080; Spring reads
# it via `server.port: ${PORT:9090}` in application.yml.
#
# Storage: on Cloud Run the filesystem is ephemeral. Writes to
# /var/portfolio/storage will survive within a single instance but are
# lost when the instance is replaced (idle scale-to-zero, deploy, etc).
# For the MVP that's fine — uploads happen only in the admin dashboard
# and there are no products yet. Migrate to Cloudflare R2 or GCS before
# selling the first digital product.
#
# All configuration comes from env vars (see .env.example at the repo
# root). Ships without any secrets.
# ---------------------------------------------------------------

# --- Build stage -----------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build

# Copy the pom first so dependency downloads are cached across code
# changes. Only invalidated when the pom itself changes.
COPY pom.xml ./
RUN mvn -B -q -DskipTests dependency:go-offline

# Then the sources.
COPY src ./src
RUN mvn -B -q -DskipTests package \
 && cp target/portfolio-api-*.jar /build/app.jar

# --- Runtime stage ---------------------------------------------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Non-root user — the JVM should never run as root in a container.
RUN groupadd --system portfolio \
 && useradd  --system --gid portfolio --home /app portfolio \
 && mkdir -p /var/portfolio/storage \
 && chown -R portfolio:portfolio /app /var/portfolio

COPY --from=builder --chown=portfolio:portfolio /build/app.jar /app/app.jar

USER portfolio

ENV APP_STORAGE_DIR=/var/portfolio/storage \
    SPRING_PROFILES_ACTIVE=prod \
    PORT=8080 \
    # JVM tuned for Cloud Run's 512 MiB free tier:
    #   * MaxRAMPercentage=65   → ~330 MiB heap ceiling, leaving room for
    #                             metaspace, thread stacks, and the OS.
    #   * UseSerialGC           → single-threaded GC has a tiny footprint
    #                             (SerialGC ~5 MiB overhead vs G1's ~50 MiB).
    #                             Portfolio traffic is low, we won't miss
    #                             concurrent GC.
    #   * MaxMetaspaceSize=128m → cap metaspace so class-loading spikes
    #                             don't push us into OOM.
    #   * TieredStopAtLevel=1   → skip C2 JIT (uses less memory + code
    #                             cache, at the cost of steady-state perf).
    #                             Also cuts cold-start by ~1s.
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=65.0 -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m -XX:TieredStopAtLevel=1"

EXPOSE 8080

# Spring Boot Actuator gives us a real health endpoint. The 45s start-
# period lets Flyway migrations + JPA schema validation finish before
# Docker starts firing "unhealthy" restarts on cold boot. (Cloud Run
# doesn't consult HEALTHCHECK, but it doesn't hurt to keep for
# docker-compose parity.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/actuator/health" | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
