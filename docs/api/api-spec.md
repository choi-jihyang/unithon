# API 스펙 — 백엔드팀 전달용 (v2, 프론트 재구조화 반영)

> 이전 버전(`api.js`/`USE_MOCK` 기반)은 폐기됨. 현재 `static/index.html`은 `js/common.js`,
> `js/handoff.js`, `js/context.js`, `js/integrations.js`, `js/questions.js`로 분리 구현되어 있고,
> `docs/planning/demo.html`을 그대로 옮긴 것이라 지금은 전부 인라인 mock 데이터로 동작한다.
> 이 문서는 그 mock을 실제 API 호출로 교체하기 위한 계약이다. 백엔드 테이블 설계는
> [`schema.md`](../planning/schema.md) 참고.

## 우선순위

1. **`GET /api/cards`, `GET /api/cards/{cardSeq}`** — F3 맥락카드, 데모 핵심 화면 ★최우선
2. **`GET /api/users`** — 이미 구현됨, F2 담당자 선택에 바로 씀
3. **`POST /api/ownership-transitions`** — F2 이관
4. **`POST /api/questions`, `POST /api/questions/{questionSeq}/answers`** — F4 질문 등록/답변
5. F1(연동수집)은 이번 범위에서 실제 백엔드 연동 없이 프론트 mock 유지 — `screen-features.md`도
   "GitHub/Jira/Figma는 구조화, Slack/Sentry/Linear는 자유서술이라 미분류 큐가 늘어남"이라고 했고,
   시간 안에 우선순위가 아님. `app_logs`/`github_logs` 등 테이블 설계는 이미 돼 있으니 나중에 붙인다.
6. **미포함(알고 넘어가는 갭)**: F4 "질문 이력 목록"을 실제로 서버에서 조회하는 `GET /api/questions`가
   없다 — 지금 `js/questions.js`는 질문 목록 자체를 정적 HTML에서 DOM으로 긁어오는 방식이라(답변만 API로
   저장), 목록까지 실제 데이터로 바꾸려면 이 GET도 추가해야 한다. `screen-features.md`의 "질문 이력 정렬"
   요구사항도 이게 있어야 가능. 시간 남으면 4번 다음으로 추가.

---

## 1. `GET /api/cards?userSeq={userSeq}` — 카드 이력 목록 (F3 히스토리 리스트)

`userSeq`는 필수 쿼리 파라미터 — 조회하는 사용자다. 서버는 `ownership_transitions`를
`new_user_seq = userSeq`에서 시작해 `old_user_seq`를 재귀로 거슬러 올라가(다갈래 포함)
연결된 모든 과거 담당자 집합 `{userSeq, ...과거 담당자들}`을 구한 뒤, `cards.user_seq IN (...)`로
조회해서 시간순으로 병합해 내려준다(자세한 로직은 [`schema.md`](../planning/schema.md)의
`ownership_transitions` 절 참고). **`cards.user_seq` 자체는 이관돼도 절대 갱신되지 않는다** —
병합은 매 조회 시점에 서버가 계산한다.

응답:
```json
[
  {
    "cardSeq": 1,
    "title": "인증 시스템",
    "solution": "그룹웨어",
    "sourceApp": "GitHub",
    "userName": "김도현",
    "startedAt": "2025-03-05",
    "decisionContent": "자체 세션 방식에서 OAuth2 기반 인증으로 전환",
    "decisionAt": "2025-05-07"
  }
]
```
- `js/context.js`의 `createHistoryRow()`가 지금 `caseData`에서 읽는 컬럼(솔루션명/앱/담당자/일자/결정)과 1:1 대응.
- `userName`은 `cards.user_seq` → `users.name` 조인 결과.
- **`sourceApp`은 반드시 `"GitHub"`/`"Jira"`/`"Figma"`/`"Slack"`/`"Sentry"`/`"Linear"` 표기(대소문자 그대로)로
  내려줘야 한다.** `js/context.js`의 `appIconMap`이 이 정확한 문자열을 키로 쓰기 때문에, `SourceType` enum의
  `.name`(전부 대문자, 예: `GITHUB`)을 그대로 내려보내면 매칭에 실패해서 아이콘 배지가 깨진다(fallback으로
  이니셜 2글자가 대신 나옴). 백엔드에서 enum ↔ 표시 문자열 변환이 필요.

## 2. `GET /api/cards/{cardSeq}?userSeq={userSeq}` — 카드 상세 (F3 모달, 담당→결정→이유→근거 체인)

`userSeq`도 필수 — 요청자가 1번 절의 병합 집합(`{userSeq, ...과거 담당자들}`)에 포함돼 있는지 서버가
확인하고, 아니면 403을 반환한다. screen-features.md F2 스펙("이관 전에는 후임자가 해당 사례에 접근 불가")
반영.

응답:
```json
{
  "cardSeq": 1,
  "title": "인증 시스템",
  "solution": "그룹웨어",
  "category": "인증/로그인",
  "tags": ["백엔드", "착수 2025.03.05"],
  "afterViewCount": 1,
  "chain": [
    { "tag": "담당", "name": "김도현", "date": "2025.05.07" },
    { "tag": "결정", "name": "자체 세션 방식에서 OAuth2 기반 인증으로 전환", "date": "2025.05.07" },
    { "tag": "이유", "name": "자체 세션 관리 방식에서 토큰 재사용 취약점이 지적되어...", "date": "2025.05.07 · 결정과 동일 시점" },
    { "tag": "근거", "name": "보안감사 리포트 #INFRA-241", "date": "2025.04.22", "tooltip": "외부 보안 감사 결과..." }
  ]
}
```
- `chain`의 `tag`는 고정 4종(`담당`/`결정`/`이유`/`근거`) — `cards.user_seq`(담당), `cards.decision_content`(결정),
  `cards.reason_content`(이유), `cards.evidence_content`+`evidence_source`(근거, `tooltip`은 근거 원문)로 매핑.
- `afterViewCount` = `SELECT COUNT(*) FROM questions WHERE card_seq = :cardSeq` — `schema.md`의 questions 절
  ("후속 문의 N건은 card_seq 기준 count로 집계")대로 지금 바로 계산 가능. access_events는 필요 없음.
- **`related` 필드는 없다.** `related_cards` 테이블 자체가 스키마에 없고(demo.html 목데이터에만 있던 죽은
  필드 — `js/context.js`도 이 값을 렌더링하지 않는다), API에도 넣지 않는다.

## 3. `POST /api/ownership-transitions` — F2 이관

요청:
```json
{ "oldUserSeq": 1, "newUserSeq": 5, "transitionedByUserSeq": 9 }
```
응답:
```json
{ "transitionedAt": "2026-08-25T15:30:00" }
```
- **카드 단위 요청이 아니다.** 담당자 A(`oldUserSeq`)가 보유한 카드 전부를 B(`newUserSeq`)에게 한 번에 넘기는
  거라, 카드가 몇 건이든 이 API 호출 1번 = `ownership_transitions` insert 1행이다. `cardSeqList` 같은 건
  요청에 없다 — 넘길 카드를 프론트에서 골라 보내지 않는다(스키마 설계 의도: 담당자가 카드를 많이 가지고
  있어도 이관 시 카드 테이블을 건드리지 않아야 하므로).
- 서버에서 `transitionedByUserSeq`의 `users.position_seq >= 5`(팀장/본부장/이사) 확인 후 실행, 아니면 403.
- `cards`는 이 API에서 전혀 갱신하지 않는다 — `GET /api/cards?userSeq=` 쪽에서 매 조회 시점에 체인을 재귀로
  병합해서 반영한다(1번 절 참고).

## 4. `POST /api/questions` — F4 질문 등록

요청:
```json
{ "userSeq": 3, "cardSeq": 1, "category": "인증/로그인", "targetPart": "DECISION", "content": "왜 이렇게 했나요?" }
```
응답:
```json
{ "questionSeq": 10 }
```
- `userSeq`(질문자) 필수 — `questions.user_seq`가 NOT NULL이라 빠지면 안 됨.

## 5. `POST /api/questions/{questionSeq}/answers` — F4 답변 등록

요청:
```json
{ "userSeq": 1, "content": "답변 내용" }
```
응답:
```json
{ "answerSeq": 1, "createdAt": "2026-08-25T15:31:00" }
```
- `userSeq`(답변자, 기존 담당자 또는 관리자) 필수 — `question_answers.user_seq`도 NOT NULL.
- 등록 성공 시 서버에서 `questions.is_answer = 1`로 갱신.

## 6. `GET /api/users` — F2 담당자 선택 피커용 사용자 목록

이미 구현된 `UserController`(`src/main/kotlin/com/example/unithon/UserController.kt`)의 엔드포인트.
`js/handoff.js`가 지금 `owners`/`handoffCandidates`를 인라인 상수로 갖고 있는데, F2 화면에서
"기존 담당자 선택" / "이관받을 담당자 선택" 목록으로 이걸 그대로 쓸 수 있다.

응답: `users` 테이블 컬럼 그대로(`User.kt` 참고) — `userSeq`, `userId`, `name`, `positionSeq`,
`positionName`, `departmentSeq`, `departmentName`, `isUse`, `createdAt`. `isUse=0`인 계정은
프론트에서 목록 표시 시 제외 권장.

> **미해결**: "기존 담당자별 보유 카드 건수/카테고리 breakdown"(`handoff.js`의 `owners.kim.projectBreakdown`)은
> 이 API만으론 못 채운다 — 특정 사용자가 현재 "보이는" 카드 집합(1번 절 병합 로직)을 계산해 카테고리별로
> 묶어야 하는데, 별도 API가 필요하다. screen-features.md에서 이관 목록(2-1)/이관 이력(2-3)은 "선택 구현"으로
> 분류돼 있어서 이번 스펙엔 포함 안 했다 — 필요해지면 추가 논의.

---

## `category`/`solution` 값 주의사항

`schema.md`의 Kotlin enum은 `인증_로그인`, `채용_시스템`처럼 밑줄(`_`)을 쓴다 — Kotlin 식별자에 `/`나
공백을 못 써서 그런 것뿐이다. **API 응답/화면에 나가는 값은 반드시 `"인증/로그인"`, `"채용 시스템"`처럼
원래 표기(`/`, 공백)여야 한다** — `enum.name`을 그대로 내려보내면 화면에 밑줄이 그대로 노출된다. 백엔드에서
enum ↔ 표시 문자열 매핑 함수를 하나 둬야 한다(예: `Category.인증_로그인.toDisplay() == "인증/로그인"`).

## 프론트 연동 방식

기존 `api.js`(`USE_MOCK` 플래그 + fetch 폴백)는 없앴다. `js/context.js`/`js/handoff.js`/`js/questions.js`가
지금은 `caseData`/`owners`/`qaThreads`를 인라인 상수로 갖고 있는데, 위 API가 준비되면 각 모듈 최상단에서
`fetch()`로 채워 넣는 초기화 함수로 바꿔치기한다(렌더링 함수는 그대로 재사용 가능 — 데이터 소스만 교체).

## 외부 시스템(Jira/GitHub 등) 연동

이번 범위 밖. 스펙은 [`app-api-spec.md`](app-api-spec.md) 참고(범위에 들어가면 재검토).
