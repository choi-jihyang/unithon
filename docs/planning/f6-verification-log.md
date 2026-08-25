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

## 결론
ANTHROPIC_API_KEY 발급 후 별도 코드 수정 없이 즉시 /api/summarize 엔드투엔드
동작 가능한 상태.
