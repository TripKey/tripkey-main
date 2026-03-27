# ── Stage 1: Build ──────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src

RUN chmod +x gradlew
RUN ./gradlew bootJar -x test

# ── Stage 2: Run ────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

# TODO: JVM 옵션 튜닝 필요 시 JAVA_OPTS 조정
ENTRYPOINT ["java", "-jar", "app.jar"]