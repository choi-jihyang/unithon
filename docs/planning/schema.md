# DB 스키마 설계서

> MySQL 기준. Kotlin 2.3.21 + Spring Boot 4.1, JPA(Hibernate) 환경에서 구현.
> 관련 문서: [`prd.md`](prd.md)(제품 개요), [`screen-features.md`](screen-features.md)(화면별 기능 명세), [`demo.html`](demo.html)(프로토타입)
> 이 문서를 기준으로 JPA Entity와 스키마 SQL을 작성하세요. 한 번에 전부 만들지 말고, 테이블 하나씩 보여주면서 진행하세요.

## 담당 경계 (중요)

- 본 스키마는 PRD MVP 범위(F1 연동수집 ~ F5 성과)를 다룬다.
- `entities`/`relations` 같은 범용 그래프 노드·엣지 모델은 채택하지 않았다 — 카드가 항상 담당·결정·이유·근거 고정 구조라 `cards` 테이블 컬럼으로 평탄화하고, 질문↔카드 연결은 FK로 직접 매핑한다. 카드↔카드 "관련 사례" 링크는 demo.html 목데이터에만 있고 실제 렌더링·요구사항 근거가 없어 이번 스키마에서 제외(`related_cards` 미도입).
- `users`는 회사 기존 계정 체계(SSO 연동 예정)를 매핑해오는 로컬 테이블로 본다. PK는 `user_seq`(로컬 참조용)이고, 로그인 식별은 `user_id`(회사 계정 식별자)가 담당한다 — `email`은 두지 않는다. 다른 테이블에서 users 데이터가 필요하면 전부 `user_seq` 값을 저장·참조한다. 직급/부서도 로컬 마스터 없이 회사 쪽 코드+이름을 그대로 스냅샷 저장한다. `password`는 당장 쓰지 않아도 로그인 화면 확장을 위해 컬럼은 유지한다.
- F1 연동 소스 중 GitHub/Jira/Figma(정형 소스)만 원본 테이블을 둔다. Slack/Sentry/Linear(비정형 소스)는 이번 스키마에서 보류 — 필요해지면 동일 패턴(`slack_logs` 등)으로 추가.
- F3 카드 댓글 스레드(screen-features.md 3-4, 신규 화면·스펙 미확정)는 이번 스키마에서 제외.
- F6 AI요약은 별도 테이블 없이 카드 콘텐츠 기반 조건부 표시로 처리(로드맵 확장 시 재검토).

## 공통 규칙

- 신규 테이블은 `seq`(PK, AUTO_INCREMENT) + `created_at` 포함(마스터 테이블은 `seq`+`name`만). `users`만 예외로 PK를 `user_seq`로 둔다(회사 users 테이블 매핑 대상이라 도메인 접두어를 붙임).
- 다른 테이블에서 `users`의 데이터를 가져올 땐 `user_seq` 값을 저장한다 — users를 참조하는 컬럼명은 `user_seq`로 통일한다(과거엔 `user_id`였으나, `users.user_id`가 별도 의미의 컬럼이 되면서 혼동을 피하려 변경). 단, 한 테이블에 users 참조가 여러 개면 역할별로 구분한다(`ownership_transitions`의 `old_user_seq`/`new_user_seq`/`transitioned_by`).
- FK는 물리 제약(REFERENCES)을 기본으로 쓴다. 예외: `app_logs.source_seq`는 `source_type`에 따라 참조 대상 테이블이 바뀌므로 물리 FK를 걸지 않고 애플리케이션에서 분기 조회한다.
- 솔루션/유형/직급/부서는 전부 로컬 마스터 테이블 없이 코드 ENUM(또는 회사 쪽 스냅샷)으로 관리한다. 화면의 "+새 솔루션/유형 추가"는 UI만 두고 실제 추가 기능은 고도화 단계로 미룬다.
- 상태값의 "종류"는 ENUM(코드)으로 관리한다.

---

## Enum (코드에서 관리)

```kotlin
enum class SourceType { GITHUB, JIRA, FIGMA, SLACK, SENTRY, LINEAR, MANUAL }

enum class LogStatus {
    UNCLASSIFIED,  // 미분류 (수집만 되고 카드로 등록 안 됨) — F1 1-2 미분류 큐
    CLASSIFIED,    // 카드로 등록됨
    IGNORED        // 무시됨
}

enum class QuestionTargetPart {
    DECISION,  // 결정 내용
    REASON,    // 결정 이유
    EVIDENCE   // 근거 자료
}

enum class Solution { 그룹웨어, ERP, MES, ISO, 채용_시스템, 근태관리_시스템 }

enum class Category { 인증_로그인, 결제_정산, 데이터_파이프라인, 인프라_배포, API_연동, 프론트엔드_UI, 성능_최적화 }
```

> 직급/부서와 마찬가지로 솔루션/유형도 마스터 테이블 없이 코드 ENUM으로 관리한다. demo.html의 "+새 솔루션/유형 추가" 버튼은 화면에만 표시하고, 실제로 값을 추가하는 기능은 고도화 단계로 미룬다.

---

## 테이블

### users (회사 계정 매핑 — SSO 연동 예정)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| user_seq | BIGINT PK | 로컬 PK — 다른 테이블은 전부 이 값을 참조 |
| user_id | VARCHAR(100) UNIQUE | 회사 계정 로그인 식별자(사번/SSO subject 등) |
| name | VARCHAR(100) | |
| password | VARCHAR(255) nullable | SSO 도입 전제, 로그인 화면 확장 대비용으로 컬럼만 유지 |
| position_seq | BIGINT | 직급 코드 (회사 시스템 코드값, 1~7) |
| position_name | VARCHAR(50) | 직급명 (예: 팀장) |
| department_seq | BIGINT nullable | 부서 코드 |
| department_name | VARCHAR(100) nullable | 부서명 |
| is_use | TINYINT | 0=비활성, 1=활성 (기본 1) |
| created_at | DATETIME | |

- `email` 컬럼은 제거 — 로그인 식별은 `user_id`(회사 계정 식별자)가 담당.
- 직급/부서는 로컬 마스터 테이블 없이 회사 쪽 코드+이름을 그대로 스냅샷 저장(FK 없음). 시드 기준 직급 코드: 1 사원 · 2 대리 · 3 과장 · 4 부장 · 5 팀장 · 6 본부장 · 7 이사.
- F2 이관 실행 권한: `position_seq >= 5`(팀장/본부장/이사)만 "담당자 이관하기" 버튼 동작 허용. 메뉴 노출 자체의 권한 분리는 고도화 단계로 미룸(screen-features.md).
- 인덱스: user_id(UNIQUE), position_seq, department_seq

---

### cards (맥락카드 — 담당·결정·이유·근거)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | 최초 생성 담당자 — 이관돼도 갱신하지 않음(`ownership_transitions` 참고) |
| solution | VARCHAR(30) nullable | Solution — 그룹웨어/ERP/MES 등 |
| category | VARCHAR(30) nullable | Category — 유형(인증/로그인 등) |
| title | VARCHAR(255) nullable | 카드 제목 |
| decision_content | TEXT nullable | 결정 |
| reason_content | TEXT nullable | 이유 |
| evidence_content | TEXT nullable | 근거 내용 |
| evidence_source | VARCHAR(500) nullable | 근거 링크/티켓번호 |
| source_app | VARCHAR(20) nullable | SourceType — 카드가 만들어진 출처 |
| started_at | DATE nullable | 착수일 |
| created_at | DATETIME | |
| updated_at | DATETIME nullable | |

- `user_seq`/`seq`/`created_at` 외 전부 nullable — "확인되지 않은 항목은 비워두고 나중에 채운다"는 등록 폼 스펙 반영.
- 인덱스: user_seq, solution, category

---

### app_logs (수집 로그 — 미분류 큐 포함, 카드 후보 형태로 정형화)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | 수집/작성 주체 |
| source_type | VARCHAR(20) | SourceType |
| source_seq | BIGINT nullable | source_type별 원본 테이블(github_logs/jira_logs/figma_logs)의 seq. MANUAL이면 NULL |
| solution | VARCHAR(30) nullable | Solution — 그룹웨어/ERP/MES 등 |
| category | VARCHAR(30) nullable | Category — 유형(인증/로그인 등) |
| title | VARCHAR(255) nullable | |
| decision_content | TEXT nullable | |
| reason_content | TEXT nullable | |
| evidence_content | TEXT nullable | |
| evidence_source | VARCHAR(500) nullable | |
| started_at | DATE nullable | |
| status | VARCHAR(20) | LogStatus, 기본 UNCLASSIFIED |
| card_seq | BIGINT nullable (→cards.seq) | 분류(카드 등록) 시 연결 |
| created_at | DATETIME | |

- `source_seq`는 `source_type`마다 대상 테이블이 달라 물리 FK를 걸지 않는다(공통 규칙 예외) — 조회 시 애플리케이션에서 `source_type` 분기.
- `status`가 `CLASSIFIED`로 바뀌는 시점에 `cards` insert + `card_seq` 갱신(F1 1-3 "카드로 등록").
- F1 1-3 수동 결정 기록은 `source_type=MANUAL`, `source_seq=NULL`로 이 테이블에 바로 insert된다 — 수동입력도 하나의 수집 이벤트로 취급(screen-features.md).
- `raw_content` 같은 단일 blob 컬럼은 두지 않는다 — 실제 표시에 쓰는 데이터를 `cards`와 동일한 컬럼 형태로 정형화해서 담는다.
- 인덱스: (user_seq, status), source_type

### github_logs (GitHub 원본 수집 데이터)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | 연동 소유자 |
| repo_name | VARCHAR(255) nullable | |
| type | VARCHAR(20) | COMMIT / PR / REVIEW_COMMENT |
| title | VARCHAR(500) nullable | 커밋 메시지 / PR 제목 |
| content | TEXT nullable | PR 설명 / 리뷰 코멘트 본문 |
| author | VARCHAR(100) nullable | GitHub 작성자명 |
| url | VARCHAR(500) nullable | 원본 링크 |
| occurred_at | DATETIME nullable | 실제 발생 시각 |
| created_at | DATETIME | 수집 시각 |

### jira_logs (Jira 원본 수집 데이터)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | |
| ticket_key | VARCHAR(50) nullable | 예: PROJ-123 |
| ticket_title | VARCHAR(500) nullable | |
| content | TEXT nullable | 스프린트 코멘트 / 설명 |
| status | VARCHAR(50) nullable | 티켓 상태 |
| url | VARCHAR(500) nullable | |
| occurred_at | DATETIME nullable | |
| created_at | DATETIME | |

### figma_logs (Figma 원본 수집 데이터)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | |
| file_name | VARCHAR(255) nullable | |
| comment_content | TEXT nullable | 디자인 코멘트 |
| version_label | VARCHAR(100) nullable | 버전 히스토리 라벨 |
| author | VARCHAR(100) nullable | |
| url | VARCHAR(500) nullable | |
| occurred_at | DATETIME nullable | |
| created_at | DATETIME | |

### user_map_app (유저별 연동 소스 on/off)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | |
| source_type | VARCHAR(20) | SourceType(MANUAL 제외) |
| enabled | TINYINT | 0=off, 1=on (기본 0) |
| updated_at | DATETIME | |

- 유저마다 독립 저장(사용자 A가 끄더라도 B에는 영향 없음).
- UNIQUE(user_seq, source_type)

---

### questions (질문)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| user_seq | BIGINT (→users.user_seq) | 질문자 |
| card_seq | BIGINT nullable (→cards.seq) | 대상카드 |
| category | VARCHAR(30) nullable | Category — 유형(인증/로그인, 결제/정산 등), `cards.category`와 같은 ENUM 공유 |
| target_part | VARCHAR(20) | QuestionTargetPart — 카드의 결정/이유/근거 중 어느 항목에 대한 질문인지 |
| content | TEXT | |
| is_answer | TINYINT | 0=미답변, 1=답변완료 (기본 0, 답변 등록 시 갱신) |
| created_at | DATETIME | |

- 카드 상세에서 "후속 문의 N건"은 `card_seq` 기준 count로 집계.
- 인덱스: card_seq, (category, is_answer), created_at

### question_answers (질문 답변 — 스레드)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| question_seq | BIGINT (→questions.seq) | |
| user_seq | BIGINT (→users.user_seq) | 답변자(기존 담당자 또는 관리자) |
| content | TEXT | |
| created_at | DATETIME | |

- 질문 1건에 여러 답변이 쌓일 수 있음(스레드형). 첫 답변 등록 시 `questions.is_answer=1` 갱신.
- 인덱스: question_seq

---

### ownership_transitions (이관 기록 — 담당자 단위 인계 이벤트)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| seq | BIGINT PK | |
| old_user_seq | BIGINT (→users.user_seq) | 기존 담당자 |
| new_user_seq | BIGINT (→users.user_seq) | 신규 담당자 |
| transitioned_by | BIGINT (→users.user_seq) | 이관 실행자 |
| transitioned_at | DATETIME | |

- `card_seq`를 두지 않는다. 담당자가 보유한 카드가 많아지면 이관마다 카드 테이블을 전부 UPDATE해야 해서 DB 부하가 커질 수 있어, **카드는 건드리지 않고 담당자↔담당자 인계 이벤트만 1행 기록**한다.
- 이관해도 `cards.user_seq`는 절대 갱신하지 않는다 — 카드는 처음 만들어졌을 때의 담당자로 고정. "현재 이 카드를 누가 볼 수 있는가"는 조회 시점에 아래 로직으로 계산한다.
- **카드 조회 로직**: 사용자 X가 카드 목록을 조회하면, `ownership_transitions`에서 `new_user_seq=X`인 행을 찾아 `old_user_seq`를 얻고, 그 `old_user_seq`에 대해서도 다시 `new_user_seq=old_user_seq`로 재귀 조회 — 이런 식으로 체인을 끝까지 거슬러 올라가(`WITH RECURSIVE`) X에게 연결된 모든 과거 담당자 집합을 구한다. 갈래가 여러 개일 수 있다(예: C가 B와 D 양쪽에서 이관받은 경우 B/D 모두, 그리고 각각의 이전 담당자까지). 이 집합 전체(`{X, ...과거 담당자들}`)로 `cards.user_seq IN (...)` 조회 후 시간순 정렬해서 병합 노출한다.
- 예시: A→B→C로 순차 이관되면, C가 조회할 때 A/B/C 담당자였던 카드가 모두 시간순으로 함께 보인다.
- 인덱스: new_user_seq, old_user_seq

---

## 핵심 로직 메모 (구현 시 주의)

1. **F1 앱 로그 처리 흐름**: GitHub/Jira/Figma 연동 시 각 원본 테이블(`github_logs`/`jira_logs`/`figma_logs`)에 그대로 적재 → 동시에(또는 배치로) `app_logs`에 카드 후보 형태(제목/결정/이유/근거)로 정형화해서 통합 노출, `source_type`+`source_seq`로 원본을 역참조. F1 1-3 수동 결정 기록은 `source_type=MANUAL`로 `app_logs`에 직접 insert.
2. **F1 1-2 → 카드 등록**: `app_logs.status`가 `UNCLASSIFIED → CLASSIFIED`로 바뀔 때 `cards`에 insert하고 `app_logs.card_seq`를 갱신한다. `IGNORED`는 카드 미생성.
3. **F2 이관 실행**: 서버에서 `users.position_seq >= 5` 확인 → `ownership_transitions`에 담당자 인계 이벤트 1행만 insert(`old_user_seq`/`new_user_seq`/`transitioned_by`). 카드 테이블은 건드리지 않는다 — 신규 담당자가 F3에서 카드를 조회하는 시점에 이관 체인을 재귀로 거슬러 올라가 과거 담당자들의 카드까지 함께 병합해서 보여준다(위 `ownership_transitions` 설명 참고).
4. **F4 질문-답변**: 질문은 `card_seq`로 특정 카드에 직접 연결, `target_part`로 결정/이유/근거 중 어떤 부분에 대한 질문인지 구분. 답변은 `question_answers`에 스레드로 쌓이고, 첫 답변 등록 시 `questions.is_answer=1` 갱신.
5. **F5 성과 지표**: 별도 집계 테이블 없이 `ownership_transitions`(이관 이력), `cards`/`app_logs`(노드·로그 수)를 직접 집계해서 대시보드에 노출. 카드 노출/조회 이력(`access_events`)은 이번 스키마에서 제외 — 고도화 단계에서 추가.
6. **카드 수정**: `cards`는 update 시 해당 행을 직접 갱신(현재 상태만 유지, 이력 테이블 없음). 누가/언제/무엇을 바꿨는지 추적이 필요해지면 `card_edit_history`(필드 단위 before/after) 같은 이력 테이블을 별도로 확장.

## 미정 / 추후 확정 항목

- [ ] `app_logs.source_seq`를 물리 FK 없는 범용 포인터로 유지할지 — 연동 소스가 늘어나면(Slack/Sentry/Linear 등) 재검토
- [ ] Slack/Sentry/Linear 원본 로그 테이블(`slack_logs`/`sentry_logs`/`linear_logs`) 추가 여부 — 비정형 소스라 컬럼 구조화가 GitHub/Jira/Figma보다 애매함
- [ ] F3 카드 댓글 스레드(screen-features.md 3-4, 신규 화면) — 이번 스키마엔 미포함, 화면 스펙 확정 후 추가 검토
- [ ] 카드 노출/조회 이력(`access_events`) — F5 "카드 노출 후 질문 미발생률" 지표의 데이터 원천이었으나 고도화 단계로 미룸. 그 전까지는 해당 지표 계산 불가
