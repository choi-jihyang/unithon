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

## mock 서버 기반 엔드투엔드 검증 완료 (2026-08-25, 이어서 진행)

실제 Anthropic API 대신 로컬 mock 서버(`mock-server/fake_anthropic.py`, `http://localhost:8888`)로
`/api/summarize` 전체 경로를 0원으로 완전 검증.

### 구성

- `mock-server/fake_anthropic.py` — Anthropic Messages API 응답 형태를 흉내내는 순수 Python
  `http.server` 기반 fake 서버. 받은 요청 본문을 그대로 콘솔에 출력하고,
  `[MOCK 요약] <원문 앞 40자>...` 형태의 고정 응답을 반환.
- `SummarizeService.kt` — `baseUrl`을 생성자 주입으로 분리:
  `@Value("\${anthropic.base-url:https://api.anthropic.com/v1/messages}")`
  — 프로퍼티 미설정 시 기본값이 실제 운영 Anthropic URL이므로, 운영 환경에서는
  이 설정을 생략하면 코드 변경 없이 진짜 API로 자동 전환됨.
- `application-test.properties`에 추가:
  ```
  anthropic.base-url=http://localhost:8888/v1/messages
  anthropic.api-key=mock-key-for-local-test
  ```

### 실행 순서 및 결과

1. `python -u mock-server/fake_anthropic.py` (백그라운드) → `Fake Anthropic server running on http://localhost:8888` 확인
2. `.\gradlew.bat bootRun --args='--spring.profiles.active=test'` → H2 DataSource, `WebClient.Builder`,
   `anthropic.api-key`/`anthropic.base-url` 모두 정상 해석되어 `Started UnithonApplicationKt in 14.552 seconds`
3. curl 요청 (최초 시도는 실패 — 아래 "발견한 이슈" 참고):
   ```
   curl -s -X POST http://localhost:8080/api/summarize -H "Content-Type: application/json; charset=utf-8" --data-binary @mock-server/test-payload.json
   ```
4. **mock 서버 콘솔**:
   ```
   Fake Anthropic server running on http://localhost:8888
   받은 요청: {"model": "claude-haiku-4-5", "max_tokens": 300, "messages": [{"role": "user", "content": "다음 텍스트를 한 문장으로 간결하게 요약해줘. 요약 문장만 출력해:\n\nOAuth2 기반 로그인 플로우를 리팩터링하면서 세션 만료 처리를 토큰 갱신 방식으로 변경했다."}]}
   [MOCK SERVER] "POST /v1/messages HTTP/1.1" 200 -
   ```
5. **curl 응답**:
   ```json
   {"summary":"[MOCK 요약] 다음 텍스트를 한 문장으로 간결하게 요약해줘. 요약 문장만 출력해:\n\nO..."}
   ```

### 발견한 이슈: curl 인라인 한글 payload의 UTF-8 인코딩 오류

`curl -d '{"text":"...한글..."}'` 형태로 셸 인자에 한글을 직접 넣으면
Windows(Git Bash) 환경에서 시스템 코드페이지(CP949 추정)로 인코딩되어 전송되고,
서버는 `HttpMessageNotReadableException: JSON parse error: Invalid UTF-8 start byte 0xb1`로
400을 반환함. **해결**: JSON 페이로드를 별도 파일(`mock-server/test-payload.json`, UTF-8)로 작성 후
`curl --data-binary @파일` 로 전송 — 이후 정상 동작.
이 환경에서 한글이 포함된 curl 테스트를 할 때는 항상 파일 기반 payload를 사용할 것.

## 결론
- ANTHROPIC_API_KEY 발급 후 별도 코드 수정 없이 즉시 /api/summarize 엔드투엔드
  동작 가능한 상태.
- mock 서버 기반 엔드투엔드 검증으로 컨트롤러→서비스→WebClient→응답 파싱까지
  전체 경로가 실제 Anthropic API 없이도 0원으로 검증 완료됨.
- **운영 전환 방법**: `anthropic.base-url`을 지정하지 않으면(default 프로필 등)
  `SummarizeService`가 자동으로 실제 Anthropic API(`https://api.anthropic.com/v1/messages`)를
  사용하므로, 코드 변경 없이 프로퍼티 설정만으로 mock ↔ 실제 API 전환 가능.
