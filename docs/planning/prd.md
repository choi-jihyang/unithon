# PRD — 떠난 사람은 없다 (가칭)

버전 0.1 · 작성 기준: 해커톤(UNITHON 2026) MVP 범위
스택: Kotlin 2.3.21 + Spring Boot 4.1, Java 17, MySQL, Gradle

---

## 1. 제품 개요

### 1-1. 문제
- 퇴사/이동 시 인수인계 문서가 부실하거나 아예 작성되지 않는다.
- 신입/후임이 같은 질문을 반복하고, 그때마다 기존 담당자가 다시 설명해야 한다.

### 1-2. 해결
업무 활동을 지식 그래프로 자동 축적하고, 후임자가 관련 화면에 진입하는 시점에 관계 체인(담당→결정→이유→근거)을 자동으로 노출한다.

### 1-3. MVP 범위 (해커톤 2박3일 기준)
- 실제 Git/Slack/Jira API 연동 **제외** — 시드 데이터 + 수동 입력 폼으로 그래프 생성
- 프론트는 최소 뷰(목록형 그래프 탐색 결과, 카드 UI)로 한정
- HR 시스템 연동 **제외** — 퇴사/이동 이벤트는 관리자 화면에서 수동 트리거
- 인증/권한 관리 **최소화** — 역할 구분(관리자/일반 사용자) 정도만

### 1-4. MVP 밖 (향후 로드맵)
- 실시간 Git/Slack/Confluence Webhook 연동
- 임베딩 기반 유사도 검색(현재는 명시적 그래프 관계 탐색만)
- 다국어 지원
- SSO/사내 IDP 연동

---

## 2. 사용자 정의

| 유형 | 설명 | 핵심 니즈 |
|---|---|---|
| 기존 담당자 (Owner) | 프로젝트/모듈을 담당 중인 구성원 | 평소처럼 일하는 것 외에 추가 행동 없이 맥락이 기록되길 원함 |
| 후임자 (Successor) | 담당이 이관된 신규 담당자, 또는 신입 | 진입 시점에 "왜 이렇게 돼 있는지" 빠르게 파악하길 원함 |
| 관리자 (Admin) | 인사/조직 관리 담당 | 이관 이벤트 등록, 전체 그래프 현황 파악 |

---

## 3. 핵심 기능 명세

### F1. 활동 기록 (그래프 적재)

**목적**: 담당자의 결정/이유/근거를 그래프 노드·엣지로 등록

**MVP 구현**: 실제 API 연동 대신, 아래 두 경로로 데이터를 확보한다.
1. **시드 스크립트**: 가상 인물의 6개월 활동(커밋 메시지, 티켓, 결정 사유)을 미리 생성해 DB에 적재 (데모용)
2. **수동 입력 폼**: "결정 기록하기" 화면에서 담당자가 [무엇을/왜/근거링크]를 입력 → 엔티티·관계 자동 생성 (라이브 데모 대체 경로)

**입력 필드**
- 대상 프로젝트/모듈명
- 결정 내용 (자유 텍스트)
- 이유 (자유 텍스트)
- 근거 (URL 또는 티켓번호, optional)

### F2. 이관 트리거

**목적**: 담당자 변경을 그래프에 반영

**동작**
- 관리자 화면에서 "담당자 변경" 이벤트 등록 (기존 담당자 → 신규 담당자, 또는 미배정)
- `ownership_transitions` 테이블에 레코드 생성
- 기존 담당자와 연결된 서브그래프는 그대로 유지되되, `next_owner_id`가 갱신됨
- **사람이 별도 문서를 작성하는 화면 자체가 존재하지 않음** (제품 설계상 의도적 배제)

### F3. 컨텍스트 트리거 & 카드 노출

**목적**: 후임자가 특정 컨텍스트에 진입 시 관련 그래프를 선제 노출

**동작**
1. 후임자가 특정 리포지토리/문서/티켓 페이지에 접근 (MVP에서는 "프로젝트 상세 페이지 접근"으로 컨텍스트 범위를 좁힘)
2. 서버가 `context_triggers` 테이블에서 해당 컨텍스트와 연결된 엔티티 조회
3. 해당 엔티티 기준으로 그래프 재귀 탐색 (`WITH RECURSIVE`, 깊이 3-hop 제한)
4. 탐색 결과를 "카드" 형태로 응답: `[담당자, 결정, 이유, 근거]` 리스트
5. `access_events`에 노출 이력 기록

**노출 카드 예시**
```
📌 이 프로젝트는 김OO 님이 담당했습니다.
   2025.11 — 트래픽 급증 이슈로 A방식 대신 B방식 채택
   근거: 장애 티켓 #392 (링크)
```

### F4. 질문 로깅 (커버리지 측정)

**목적**: 카드 노출 이후에도 실제 질문이 발생했는지 기록해 "선제성"을 정량 증명

**동작**
- 후임자가 시스템 내 "질문하기" 버튼으로 질문을 남기면 `access_events.question_asked_after = true`로 갱신
- 이 데이터로 "카드 노출 후 질문 발생률"을 계산 → 데모 및 사업계획서 KPI로 사용

**유사 질문 검색 (신규)**: 질문을 등록하기 전에, 과거에 이미 같은/비슷한 질문이
있었는지 먼저 보여준다. 한국어 SBERT(`jhgan/ko-sroberta-multitask`) 임베딩을 빌드
타임에 미리 계산해 정적 JSON으로 서빙하고, 프론트에서 코사인 유사도로 top-3를
찾는다. LLM 생성 없이 축적된 실제 질문·답변 원문을 그대로 반환하므로 환각이 없고
출처(작성자·부서·날짜)를 추적할 수 있다. 상세 설계는
[`similar-question-search.md`](similar-question-search.md) 참고.

### F5. 관리자 대시보드 (최소 버전)

- 전체 그래프 노드/엣지 수
- 최근 이관 이벤트 목록
- 컨텍스트 노출 후 질문 미발생 비율 (핵심 지표)

---

## 4. 데이터 모델 (MySQL)

```sql
CREATE TABLE entities (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('person','project','decision','document','ticket') NOT NULL,
  name VARCHAR(255) NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE relations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source_entity_id BIGINT NOT NULL,
  target_entity_id BIGINT NOT NULL,
  relation_type ENUM('담당했다','결정했다','왜냐하면','참고했다','후임이다') NOT NULL,
  evidence_source VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_entity_id) REFERENCES entities(id),
  FOREIGN KEY (target_entity_id) REFERENCES entities(id)
);

CREATE TABLE ownership_transitions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  entity_id BIGINT NOT NULL,
  previous_owner_id BIGINT,
  next_owner_id BIGINT,
  transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id)
);

CREATE TABLE context_triggers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  trigger_type ENUM('repo_access','doc_open','ticket_view','project_view') NOT NULL,
  context_identifier VARCHAR(500) NOT NULL,
  linked_entity_id BIGINT NOT NULL,
  FOREIGN KEY (linked_entity_id) REFERENCES entities(id)
);

CREATE TABLE access_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  entity_id BIGINT NOT NULL,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  surfaced_context JSON,
  question_asked_after BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (entity_id) REFERENCES entities(id)
);
```

**그래프 탐색 쿼리 (3-hop 제한)**
```sql
WITH RECURSIVE context_chain AS (
  SELECT id, source_entity_id, target_entity_id, relation_type, evidence_source, 1 AS depth
  FROM relations WHERE target_entity_id = :accessed_entity_id
  UNION ALL
  SELECT r.id, r.source_entity_id, r.target_entity_id, r.relation_type, r.evidence_source, c.depth + 1
  FROM relations r
  JOIN context_chain c ON r.target_entity_id = c.source_entity_id
  WHERE c.depth < 3
)
SELECT * FROM context_chain;
```

---

## 5. API 명세 (초안)

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/entities` | 엔티티 생성 (사람/프로젝트/결정/문서/티켓) |
| POST | `/api/relations` | 관계 생성 |
| POST | `/api/ownership-transitions` | 담당자 변경 이벤트 등록 |
| GET | `/api/context/{contextIdentifier}` | 컨텍스트 접근 시 관련 그래프 카드 조회 (F3 핵심 엔드포인트) |
| POST | `/api/access-events` | 접근 이력 기록 |
| PATCH | `/api/access-events/{id}/question` | 후속 질문 발생 여부 갱신 |
| GET | `/api/admin/dashboard` | 관리자 대시보드 집계 데이터 |
| GET | `/api/entities/{id}/graph` | 특정 엔티티 기준 N-hop 그래프 조회 |

---

## 6. 화면 정의 (와이어프레임 수준)

1. **프로젝트 상세 페이지**: 상단에 "이 프로젝트의 맥락" 카드 자동 노출 (F3 결과)
2. **결정 기록 입력 폼**: 담당자가 결정/이유/근거를 입력하는 간단한 폼 (F1)
3. **관리자 - 담당자 변경**: 드롭다운으로 기존/신규 담당자 선택 후 등록 (F2)
4. **관리자 대시보드**: 노출 카드 수, 질문 미발생률 등 핵심 지표 (F5)

---

## 7. 비기능 요구사항 (해커톤 수준)

- 그래프 탐색 응답 3초 이내 (3-hop 제한으로 확보)
- 시드 데이터 최소 1개 인물, 6개월 분량, 결정 노드 5개 이상 준비 (데모 신뢰도 확보)
- 별도 인증 서버 없이 세션 기반 간이 로그인으로 대체 가능

---

## 8. 성공 지표 (데모/발표용)

| 지표 | 측정 방법 |
|---|---|
| 인수인계 문서 작성 시간 | 0분 (해당 화면 자체가 없음을 시연) |
| 카드 노출 후 질문 미발생률 | `access_events` 중 `question_asked_after = false` 비율 |
| 그래프 탐색 응답 속도 | API 응답 시간 로그 |