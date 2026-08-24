# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is a Gradle (Kotlin DSL) project. Use the wrapper, not a global `gradle`/`kotlin` install.

- Build: `./gradlew build`
- Run the app: `./gradlew bootRun` (serves on `http://localhost:8080`)
- Run all tests: `./gradlew test`
- Run a single test class: `./gradlew test --tests "com.example.unithon.UnithonApplicationTests"`
- Run a single test method: `./gradlew test --tests "com.example.unithon.UnithonApplicationTests.contextLoads"`

On Windows PowerShell, use `gradlew.bat` in place of `./gradlew`.

**MySQL is required to run or test the app.** `spring-boot-starter-data-jpa` is on the classpath, so Spring Boot auto-configures a datasource on startup; without a MySQL instance reachable at the URL in `application.properties` (`jdbc:mysql://localhost:3306/unithon`), `bootRun` and any `@SpringBootTest` will fail at context startup.

If `bootRun` fails with "Port 8080 was already in use", a previous run is likely still alive (`netstat -ano | grep :8080` to find the PID, then stop it) rather than a real conflict.

## Architecture

- Single-module Kotlin/Spring Boot app, package root `com.example.unithon`, source under `src/main/kotlin`.
- Stack: Spring Boot 4.1 (`spring-boot-starter-webmvc`, `spring-boot-starter-data-jpa`), Kotlin 2.3.21, Java 17 toolchain, MySQL via `mysql-connector-j`. Jackson uses `jackson-module-kotlin` for JSON (de)serialization.
- `kotlin("plugin.jpa")` + `allOpen` (configured in `build.gradle.kts`) auto-opens classes annotated `@Entity`, `@MappedSuperclass`, or `@Embeddable` — needed because Kotlin classes are `final` by default and JPA/Hibernate requires non-final entity classes for proxying. Don't add `open` manually to entities; rely on this instead.
- Kotlin compiler flags `-Xjsr305=strict` and `-Xannotation-default-target=param-property` are set project-wide: JSR-305 nullability annotations are treated as strict (non-null violations are compile errors, not warnings), and annotations on constructor `val`/`var` properties default to targeting both the parameter and the property.
- REST controllers live alongside the application class (e.g. `TestController.kt`) and return `Map<String, Any>`/data classes directly as JSON — no separate DTO layer exists yet.
- Static frontend assets are served from `src/main/resources/static/` via Spring Boot's default static resource handling (no separate frontend build/dev server). `index.html` there is a plain HTML/CSS/vanilla-JS page that calls backend endpoints with `fetch()` (e.g. `/api/test`) — treat this as the pattern for any further hand-rolled test/demo pages until a real frontend stack is introduced.
- `docs/` holds project documentation, not code: `docs/planning` for planning/spec docs, `docs/conventions` for rule/convention docs, `docs/api` for API specs.
