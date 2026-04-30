# ── Stage 1: Build ──────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src

RUN chmod +x gradlew
RUN ./gradlew bootJar -x test

# ── Stage 2: Run ────────────────────────────
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system tripkey \
    && useradd --system --gid tripkey --home-dir /app tripkey
COPY --from=builder /app/build/libs/*.jar app.jar
RUN chown -R tripkey:tripkey /app

USER tripkey

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
