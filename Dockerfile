# ---- build stage ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY . /tmp/ctx
RUN if [ -f /tmp/ctx/pom.xml ]; then \
      cp /tmp/ctx/pom.xml ./pom.xml && cp -R /tmp/ctx/src ./src; \
    elif [ -f /tmp/ctx/backend/pom.xml ]; then \
      cp /tmp/ctx/backend/pom.xml ./pom.xml && cp -R /tmp/ctx/backend/src ./src; \
    else \
      echo "ERROR: pom.xml not found in build context" && exit 1; \
    fi && rm -rf /tmp/ctx
RUN mvn -B -q -DskipTests package

# ---- run stage ----
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 app \
 && mkdir -p /app/uploads/certificates \
 && chown -R app:app /app
COPY --from=build /build/target/*.jar /app/app.jar
USER app
# Keep the JVM inside small (512 MB) instances.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
# Render injects PORT (default 10000); application.properties reads it.
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
