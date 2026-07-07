# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------
# Portfolio API — multi-stage container image.
#
#   Stage 1 (builder): resolve deps + compile fat jar via Maven.
#   Stage 2 (runtime): slim JRE + the fat jar + a non-root user.
#
# Ships without any secrets. All configuration comes from env vars
# (see .env.example at the repo root). Storage volume must be mounted
# at /var/portfolio/storage — see docker-compose.prod.yml for wiring.
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
    PORT=9090 \
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

EXPOSE 9090

# Spring Boot Actuator gives us a real health endpoint. The 45s start-
# period lets Flyway migrations + JPA schema validation finish before
# Docker starts firing "unhealthy" restarts on cold boot.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://localhost:9090/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
