# Java Overlay

Adds Eclipse Temurin JDK 21 (LTS) with Maven and Gradle for enterprise Java development.

## Features

- **Eclipse Temurin JDK 21** (LTS) - Open-source Java runtime
- **Maven** - Dependency management and build tool
- **Gradle** - Modern build automation
- **VS Code Extensions:**
    - Java Extension Pack (vscjava.vscode-java-pack) - Complete Java IDE experience
    - Gradle for Java (vscjava.vscode-gradle)
    - Maven for Java (vscjava.vscode-maven)
- **Language Server Protocol** - IntelliSense, refactoring, debugging
- **Automatic dependency installation** - Runs Maven/Gradle on container creation

## How It Works

This overlay uses the official devcontainers Java feature to install Eclipse Temurin JDK 21 with Maven and Gradle. The Java Extension Pack provides comprehensive IDE features including IntelliSense, debugging, test running, and project management.

**Installation method:**

- Eclipse Temurin JDK via SDKMAN
- Maven and Gradle installed via devcontainer feature
- Java tools accessible via PATH

## Common Commands

### Maven Projects

```bash
# Create new Maven project
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=my-app \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false

# Build project
mvn clean install

# Run application
mvn exec:java -Dexec.mainClass="com.example.App"

# Run tests
mvn test

# Package JAR
mvn package

# Skip tests
mvn install -DskipTests
```

### Gradle Projects

```bash
# Initialize new project
gradle init --type java-application

# Build project
gradle build

# Run application
gradle run

# Run tests
gradle test

# Create JAR
gradle jar

# Clean build
gradle clean build
```

### Spring Boot

```bash
# Maven - Run Spring Boot app
mvn spring-boot:run

# Gradle - Run Spring Boot app
gradle bootRun

# Build executable JAR
mvn clean package
# or
gradle bootJar

# Run with profiles
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Dependency Management

```bash
# Maven - Add dependency (edit pom.xml)
# Then resolve:
mvn dependency:resolve

# Display dependency tree
mvn dependency:tree

# Gradle - Add dependency (edit build.gradle)
# Then sync:
gradle dependencies

# Display dependency tree
gradle dependencies --configuration compileClasspath
```

## Use Cases

- **Spring Boot applications** - REST APIs, microservices, web applications
- **Enterprise Java** - J2EE, Jakarta EE applications
- **Apache Kafka** - Event streaming applications
- **Android backend** - Services for mobile apps
- **Data processing** - Apache Spark, Hadoop jobs
- **Microservices** - Cloud-native Java services

**Integrates well with:**

- `postgres`, `mysql`, `mongodb` - Database connectivity (JDBC)
- `redis` - Caching layer (Jedis, Lettuce)
- Apache Kafka - Event streaming (Spring Kafka)
- `otel-collector`, `jaeger` - Distributed tracing (OpenTelemetry Java)
- `prometheus`, `grafana` - Metrics and monitoring (Micrometer)

## Configuration

### JDK Version

The overlay installs **Java 21 (LTS)**. To use a different version, modify `devcontainer.patch.json`:

```json
{
    "features": {
        "ghcr.io/devcontainers/features/java:1": {
            "version": "17" // Change to 17, 21, or latest
        }
    }
}
```

### Maven Settings

Custom Maven settings can be placed in `~/.m2/settings.xml`:

```xml
<settings>
  <mirrors>
    <mirror>
      <id>central</id>
      <url>https://repo.maven.apache.org/maven2</url>
      <mirrorOf>central</mirrorOf>
    </mirror>
  </mirrors>
</settings>
```

### Gradle Properties

Custom Gradle properties in `~/.gradle/gradle.properties`:

```properties
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
```

## Application Integration

### Spring Boot Example

**pom.xml:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

**Application.java:**

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping("/")
    public String hello() {
        return "Hello from Spring Boot!";
    }
}
```

**Run:**

```bash
mvn spring-boot:run
# Access at http://localhost:8080
```

## Troubleshooting

### Issue: JAVA_HOME not set

**Solution:**

```bash
# Check JAVA_HOME
echo $JAVA_HOME

# Should output: /usr/local/sdkman/candidates/java/current

# If not set, add to shell profile
export JAVA_HOME=/usr/local/sdkman/candidates/java/current
```

### Issue: Maven/Gradle not found

**Symptoms:**

- `mvn: command not found`
- `gradle: command not found`

**Solution:**
Rebuild the devcontainer - Maven and Gradle are installed via the Java feature.

### Issue: Out of memory during build

**Solution:**

```bash
# Maven - increase heap size
export MAVEN_OPTS="-Xmx2048m"
mvn clean install

# Gradle - configure in gradle.properties
org.gradle.jvmargs=-Xmx2048m
```

## References

- [Eclipse Temurin](https://adoptium.net/) - Open-source JDK distribution
- [Maven Documentation](https://maven.apache.org/guides/) - Build tool
- [Gradle Documentation](https://docs.gradle.org/) - Build automation
- [Spring Boot](https://spring.io/projects/spring-boot) - Framework for Java apps
- [Java Extension Pack](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)

**Related Overlays:**

- `postgres` - PostgreSQL database (JDBC)
- `redis` - Redis cache (Jedis, Lettuce)
- `docker-sock` - Docker access for Testcontainers
- `prometheus` - Metrics collection (Micrometer)
- `jaeger` - Distributed tracing (OpenTelemetry)
