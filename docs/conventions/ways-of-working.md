# 작업 방식 / 노하우 (인턴 가이드)

이 프로젝트는 Claude로 개발한다. 아래 방식·노하우를 따른다.

## 0. 개발 준비 — 플러그인부터, 하네스 먼저
1. **Claude Code 플러그인 설치** — `/plugin`으로 마켓플레이스를 추가한 뒤 설치:
   ```
   /plugin marketplace add obra/Superpowers      # https://github.com/obra/Superpowers
   /plugin marketplace add revfactory/harness     # https://github.com/revfactory/harness
   ```
   그다음 `/plugin`에서 **superpowers**(브레인스토밍·계획·TDD·검증)와 **harness**(도메인 에이전트·스킬 구성)를 설치한다.
2. **하네스를 먼저 구성한 뒤 개발을 시작한다.** harness로 앱테크 도메인에 맞는 에이전트·스킬을 세팅하고 나서 코딩한다. **바로 코딩하지 말 것.**

## 1/plugin marketplace add obra/Superpowers. Claude 작업 흐름
브레인스토밍 → **설계(design)** → **계획(plan)** → 구현 → **별도 세션 적대 검증**.
- **한 번에 하나, 작게 쪼개기.** 큰 변경 한 방 금지(작은 PR 정책과 연결 — `pr-convention.md`).
- **생성자 ≠ 검증자**: 구현한 세션이 자기 코드를 "됐다"고 승인하지 않는다. 검증은 새 세션/서브에이전트가. → `ai-code-trust.md`.
- 설계·계획 단계에서 **수용기준·불변식**을 먼저 적는다(구현 전에).

## 2. TDD
- **실패하는 테스트 먼저 → 최소 구현 → 리팩터**(red-green-refactor).
- **돈/잔액 로직은 불변식 테스트부터**(§4). UI보다 도메인 로직 테스트를 우선.
- 발견한 버그·엣지케이스는 테스트로 고정한 뒤 고친다.

## 3. 환경 분리
- **local / alpha / prod** 분리. 환경값·시크릿은 **코드에 두지 말고 주입**.
  - backend: Spring profile(`application-local/alpha/prod.yml`), 시크릿은 서버 환경(Parameter Store 등)에서 주입.
  - app(라이브러리): `apiBaseUrl` 등은 호스트/환경에서 주입 — 라이브러리에 하드코딩 금지.
- **더미(local)로 먼저 완성**, 실제(alpha)는 설정 주입으로 교체(코드 재작성 없음). → `../spec/integration-contract.md`.

## 요약
플러그인 설치 → **하네스 구성** → (브레인스토밍→설계→계획) → **TDD로 구현** → **별도 세션 적대 검증** → 작은 PR. 환경은 분리·주입, 돈은 원장·멱등·동시성.
