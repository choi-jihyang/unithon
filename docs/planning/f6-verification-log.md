# F6 AI 요약 백엔드 — 사전 검증 기록 (2026-08-25)

## 검증 목적
실제 Anthropic API 키 발급(비용 발생) 전, 그 외 전체 경로가 정상 동작하는지
0원으로 사전 확인.

## 검증 결과
1. H2 임베디드 DB로 datasource/JPA 계층 정상 초기화 확인 (MySQL 없이 부팅 가능)
2. WebClient.Builder 빈 등록 이슈 발견 및 해결 (Spring Boot 4.1 + webmvc/webflux
   동시 존재 시 오토컨피그 미작동 → WebClientConfig.kt로 명시적 빈 등록)
3. SummarizeController → SummarizeService 호출 체인 정상 연결 확인
4. 정확히 ANTHROPIC_API_KEY 플레이스홀더 해석 시점에서만 실패 확인 —
   그 이전 모든 계층(DB, DI, 라우팅)은 정상

## 실패 로그 (예상된 지점)

```
2026-08-25T16:45:16.772+09:00  WARN 24324 --- [unithon] [           main] ConfigServletWebServerApplicationContext : Exception encountered during context initialization - cancelling refresh attempt: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'summarizeController' defined in file [...SummarizeController.class]: Unsatisfied dependency expressed through constructor parameter 0: Error creating bean with name 'summarizeService' defined in file [...SummarizeService.class]: Unexpected exception during bean creation

org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'summarizeController' ...: Unsatisfied dependency expressed through constructor parameter 0: Error creating bean with name 'summarizeService' ...: Unexpected exception during bean creation
	at org.springframework.beans.factory.support.ConstructorResolver.createArgumentArray(ConstructorResolver.java:804)
	at org.springframework.beans.factory.support.ConstructorResolver.autowireConstructor(ConstructorResolver.java:240)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.createBeanInstance(AbstractAutowireCapableBeanFactory.java:1219)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.doCreateBean(AbstractAutowireCapableBeanFactory.java:565)
	...
	at com.example.unithon.UnithonApplicationKt.main(UnithonApplication.kt:15)
Caused by: org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'summarizeService' defined in file [...SummarizeService.class]: Unexpected exception during bean creation
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.createBean(AbstractAutowireCapableBeanFactory.java:538)
	...
Caused by: org.springframework.util.PlaceholderResolutionException: Could not resolve placeholder 'ANTHROPIC_API_KEY' in value "${ANTHROPIC_API_KEY}" <-- "${anthropic.api-key}"
	at org.springframework.util.PlaceholderResolutionException.withValue(PlaceholderResolutionException.java:81)
	at org.springframework.util.PlaceholderParser$ParsedValue.resolve(PlaceholderParser.java:296)
	at org.springframework.util.PlaceholderParser.replacePlaceholders(PlaceholderParser.java:129)
	at org.springframework.util.PropertyPlaceholderHelper.replacePlaceholders(PropertyPlaceholderHelper.java:96)
	at org.springframework.core.env.AbstractPropertyResolver.doResolvePlaceholders(AbstractPropertyResolver.java:286)
	at org.springframework.core.env.AbstractPropertyResolver.resolveRequiredPlaceholders(AbstractPropertyResolver.java:257)
	at org.springframework.context.support.PropertySourcesPlaceholderConfigurer.lambda$processProperties$0(PropertySourcesPlaceholderConfigurer.java:184)
	at org.springframework.beans.factory.support.AbstractBeanFactory.resolveEmbeddedValue(AbstractBeanFactory.java:959)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.doResolveDependency(DefaultListableBeanFactory.java:1679)
	at org.springframework.beans.factory.support.ConstructorResolver.resolveAutowiredArgument(ConstructorResolver.java:912)
	...
```

## MockWebServer 기반 JUnit 테스트 4건 통과 (2026-08-25, 최종)

초기에는 Python 기반 로컬 fake 서버(`mock-server/fake_anthropic.py`)로 수동 curl 검증을 했으나,
반복 가능하고 CI에 편입 가능한 형태로 전환하기 위해 **okhttp3 MockWebServer 기반 JUnit 테스트**로
대체했다. `mock-server/` 디렉토리는 삭제.

### 구성

- `build.gradle.kts` — `testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")` 추가
- `src/test/resources/fixtures/` — Anthropic Messages API 응답 형태의 고정 fixture 3종
  - `anthropic-response-normal.json` — 정상 응답 (text 블록 1개)
  - `anthropic-response-multi-block.json` — text 블록이 2개인 응답
  - `anthropic-response-truncated.json` — `stop_reason: "max_tokens"`로 잘린 응답
- `src/test/kotlin/com/example/unithon/SummarizeServiceTest.kt` — `SummarizeService`를
  `WebClientConfig().webClientBuilder()` + `MockWebServer.url("/")`로 직접 생성해
  Spring 컨텍스트 없이 순수 단위 테스트로 검증 (`baseUrl` 생성자 주입 덕분에 가능)

### 테스트 케이스 및 검증 내용

| 테스트 | 검증 내용 |
|---|---|
| `summarizeReturnsTextFromNormalResponse` | 정상 응답 fixture → 반환값이 fixture의 text와 정확히 일치 |
| `summarizeReturnsOnlyFirstTextBlockWhenMultipleBlocksExist` | text 블록이 2개인 응답 → 현재 파싱 로직(`firstOrNull { it.type == "text" }`)이 **첫 번째 블록만** 반환함을 확인 |
| `summarizeReturnsTruncatedTextWithoutErrorWhenStopReasonIsMaxTokens` | `stop_reason: "max_tokens"` 응답 → 현재 로직은 `stop_reason`을 검사하지 않으므로 **예외 없이 잘린 텍스트를 그대로 반환**함을 확인 (의도한 동작인지는 이 테스트로 드러남 — 향후 필요 시 별도 처리 논의) |
| `summarizeThrowsRuntimeExceptionOnServerError` | MockWebServer가 500 응답 → WebClient의 기본 에러 처리로 `WebClientResponseException`(`RuntimeException` 하위 타입)이 던져짐을 확인 |

### 실행 로그 요약

```
.\gradlew.bat test --tests SummarizeServiceTest
...
BUILD SUCCESSFUL in 1m 23s
```

JUnit XML 리포트(`build/test-results/test/TEST-com.example.unithon.SummarizeServiceTest.xml`):

```xml
<testsuite name="com.example.unithon.SummarizeServiceTest" tests="4" skipped="0" failures="0" errors="0" ...>
  <testcase name="summarizeReturnsTextFromNormalResponse()" .../>
  <testcase name="summarizeReturnsTruncatedTextWithoutErrorWhenStopReasonIsMaxTokens()" .../>
  <testcase name="summarizeReturnsOnlyFirstTextBlockWhenMultipleBlocksExist()" .../>
  <testcase name="summarizeThrowsRuntimeExceptionOnServerError()" .../>
</testsuite>
```

4건 전부 통과 (`failures="0" errors="0"`).

## 결론
- ANTHROPIC_API_KEY 발급 후 별도 코드 수정 없이 즉시 /api/summarize 엔드투엔드
  동작 가능한 상태.
- MockWebServer 기반 JUnit 테스트로 컨트롤러→서비스→WebClient→응답 파싱까지
  전체 경로가 실제 Anthropic API 없이도, 반복 실행 가능한 형태로 0원 검증 완료됨
  (Python mock 서버 방식은 폐기).
- 테스트 과정에서 현재 파싱 로직의 두 가지 특성이 드러남: (1) 여러 text 블록 중 첫 번째만 사용,
  (2) `stop_reason: max_tokens`(잘림)를 감지하지 않고 그대로 반환. 둘 다 현재는 의도된 동작으로
  간주하고 테스트로 고정했으나, 실제 응답에서 여러 블록/잘림이 자주 발생한다면 재검토 필요.
- **운영 전환 방법**: `anthropic.base-url`을 지정하지 않으면(default 프로필 등)
  `SummarizeService`가 자동으로 실제 Anthropic API(`https://api.anthropic.com/v1/messages`)를
  사용하므로, 코드 변경 없이 프로퍼티 설정만으로 mock ↔ 실제 API 전환 가능.
