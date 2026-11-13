# syntax=docker/dockerfile:1

# ---- Build stage: compiles the API into a jar (the dashboard is deployed separately, so it is skipped) ----
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace

# Dependencies first, so this layer is reused while only source code changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q -Dfrontend.skip=true dependency:go-offline

COPY src/ src/

# Compile the java application
RUN ./mvnw -B -q -DskipTests -Dfrontend.skip=true package \
    && cp target/Multi-Tenant-*.jar app.jar

# ---- Run stage: a JRE only, running as an unprivileged user ----
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build --chown=app:app /workspace/app.jar app.jar
USER app

# The prod profile means no developer-only settings apply. Memory follows the container's limit.
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
