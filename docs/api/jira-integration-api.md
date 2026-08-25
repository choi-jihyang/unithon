# Jira 연동 API 설계 문서

버전: v1
기준: docs/api/api-contract.md v2 + db-schema-design.md + docs/api/github-integration-api.md (동일 패턴 참고)
목적: Jira 티켓(이슈) 데이터를 가져와 `nodes`(주로 근거) 및 `collection_logs`로 변환

> ⚠️ 원 요청에는 "커밋내역과 PR 내역"이라고 되어 있었는데, 이건 GitHub 개념이라 Jira에는 해당하지 않음. Jira는 **티켓(이슈)** 단위로 데이터를 다루므로, 이 문서에서는 "티켓/이슈 내역"으로 대체해서 작성함.

---

## 1. 개요

Jira 프로젝트의 티켓(이슈)을 가져와서, 규칙 기반으로 분류한 뒤 우리 그래프(`nodes`, `relationships`)에 반영하는 기능이다. Jira는 GitHub과 마찬가지로 "구조화 소스"로 분류되므로, `unclassified_queue`를 거치지 않고 바로 `nodes`에 반영된다.

### 트리거 방식 — 이번 범위는 수동 동기화 (GitHub과 동일한 이유)

⚠️ **가정**: Jira Cloud도 웹훅으로 실시간 이벤트를 보낼 수 있지만, 우리 서버가 `localhost`라 외부에서 접근 가능한 주소가 없어 수신이 불가능하다. GitHub 문서와 동일하게, **이번 설계는 "버튼을 누르면 그 시점 데이터를 가져오는 수동 동기화" 방식**으로 진행한다. 웹훅은 8번 섹션에 향후 확장으로 남겨둔다.

---

## 2. 사전 설정

### 환경변수

```properties
# application.properties
jira.domain=${JIRA_DOMAIN}
jira.email=${JIRA_EMAIL}
jira.api-token=${JIRA_API_TOKEN}
```

### GitHub과 인증 방식이 다름 (중요)

| | GitHub | Jira |
|---|---|---|
| 인증 방식 | `Authorization: Bearer {TOKEN}` | `Authorization: Basic {Base64(email:token)}` |
| 토큰 발급 위치 | GitHub Settings → Developer settings | `id.atlassian.com/manage-profile/security/api-tokens` |

```java
String auth = Base64.getEncoder().encodeToString((email + ":" + apiToken).getBytes());
headers.set("Authorization", "Basic " + auth);
```

---

## 3. 데이터 흐름

```
[동기화 버튼 클릭]
    ↓
POST /api/integrations/jira/sync
    ↓
① Jira API: POST /rest/api/3/search/jql (JQL로 티켓 검색)
    ↓
② 각 티켓을 collection_logs에 원본 기록
    ↓
③ ADF(Atlassian Document Format) description을 평문으로 변환
    ↓
④ 규칙 기반 분류 (5번 섹션 참고)
    ↓
⑤ 조건에 맞으면 nodes 테이블에 evidence로 저장
    ↓
⑥ relationships로 project ↔ node 연결 (또는 기존 decision/reason에 근거로 연결, 6번 참고)
    ↓
⑦ 동기화 결과 응답으로 반환
```

---

## 4. 사용할 Jira API 엔드포인트

### 요청

```
POST https://{domain}.atlassian.net/rest/api/3/search/jql
Authorization: Basic {Base64(email:token)}
Content-Type: application/json
```

```json
{
  "jql": "project = {PROJECT_KEY} ORDER BY created DESC",
  "maxResults": 20,
  "fields": ["summary", "description", "status", "priority", "created", "assignee", "project"]
}
```

⚠️ GitHub은 단순 `GET` + 쿼리 파라미터였는데, **Jira는 `POST` + JQL(Jira Query Language) 쿼리문**을 body로 보내야 함. 이게 GitHub 대비 가장 큰 구조적 차이.

### 응답 형태

```json
{
  "issues": [
    {
      "key": "INFRA-241",
      "fields": {
        "summary": "세션 하이재킹 취약점",
        "description": { "type": "doc", "content": [ /* ADF 중첩 구조 */ ] },
        "status": { "name": "Resolved" },
        "priority": { "name": "High" },
        "created": "2025-05-06T14:02:11.000+0900",
        "assignee": { "displayName": "김도현" },
        "project": { "key": "PJ-014" }
      }
    }
  ]
}
```

### ⚠️ description이 평문이 아니라 ADF — 별도 파싱 필요

GitHub의 `commit.message`나 PR `body`는 그냥 문자열이었는데, Jira의 `description`은 중첩된 JSON 구조(ADF)라서 **재귀적으로 순회하며 텍스트만 뽑아내는 파싱 함수가 반드시 필요**하다.

```java
// 의사코드
String extractText(JsonNode node) {
    if (node.has("type") && node.get("type").asText().equals("text")) {
        return node.get("text").asText();
    }
    StringBuilder sb = new StringBuilder();
    if (node.has("content")) {
        for (JsonNode child : node.get("content")) {
            sb.append(extractText(child));
        }
    }
    return sb.toString();
}
```

### 우리가 실제로 뽑아 쓰는 필드

| Jira 필드 | 우리 쪽 매핑 대상 |
|---|---|
| `key` | `nodes.evidence_ref` (예: `#INFRA-241`) |
| `fields.summary` | `nodes.title` |
| `fields.description` (ADF 파싱 후) | `nodes.title`에 요약 형태로 덧붙이거나 별도 상세 필드 필요(현재 스키마엔 상세 원문 저장 컬럼 없음, 9번 참고) |
| `fields.priority.name` | 분류 가중치 판단용 (6번 참고), DB 저장은 안 함 |
| `fields.created` | `nodes.made_at`, `collection_logs.occurred_at` |
| `fields.assignee.displayName` | 사용자 매칭용 |
| `fields.project.key` | 프로젝트 매칭용 — **GitHub과 달리 라벨 추론 없이 바로 매칭 가능** (아래 참고) |

---

## 5. 프로젝트 매칭 규칙 — GitHub보다 쉬움

GitHub은 라벨/태그로 프로젝트를 추론해야 했는데, **Jira는 `fields.project.key`가 티켓에 이미 명시되어 있어서 별도 추론 로직이 필요 없다.**

- Jira 프로젝트 키(`INFRA`, `PAY` 등)와 우리 `projects.code`(`PJ-014` 등)가 다른 체계라면, **매핑 테이블이 하나 필요**하다.
- 이번 범위에서는 간단히 `application.properties`에 매핑을 하드코딩:
  ```properties
  jira.project-mapping.INFRA=PJ-014
  jira.project-mapping.PAY=PJ-021
  ```
- 매핑에 없는 Jira 프로젝트 키는 GitHub과 동일하게 `collection_logs`에만 기록하고 `nodes`엔 안 넣음.

---

## 6. 분류 규칙

GitHub은 `decision`(커밋/PR)과 `reason`(PR 본문)을 만들었는데, **Jira 티켓은 기본적으로 `evidence`(근거) 노드로 취급**한다. 이유: 티켓은 "무엇을 왜 하기로 했는지"를 직접 말하기보다, "이런 문제가 있었다"는 근거 자료 성격이 강하기 때문 (이전에 정리했던 6개 소스 비교에서도 Jira는 근거 노드로 분류했었음).

| 조건 | 처리 |
|---|---|
| `priority`가 `High`(또는 상당 수준 이상) | `nodes`에 `node_type=evidence`로 저장 |
| `priority`가 낮음(Low 등) | `collection_logs`에만 기록 |
| `status`가 `Resolved`/`Done`류가 아님(진행 중) | `collection_logs`에만 기록 (아직 결론이 안 난 티켓이므로) |

### 기존 decision/reason과 연결 (선택 사항, 있으면 더 좋음)

GitHub PR 본문에 `#INFRA-241`처럼 Jira 티켓 번호가 언급되어 있으면, 그 GitHub PR에서 만든 `reason` 노드와 이 Jira `evidence` 노드를 `relationships`로 `근거` 관계 연결할 수 있다. **다만 이건 텍스트에서 티켓 번호 패턴(`[A-Z]+-\d+`)을 찾아내는 별도 매칭 로직이 필요해서, 1차 구현 범위에서는 생략하고 향후 개선으로 남겨도 무방하다.**

---

## 7. 사용자 매칭

Jira `fields.assignee.displayName`(한글 이름으로 나옴, 예: "김도현")과 우리 `users.name`을 **완전 일치**로 매칭. GitHub은 영문 계정명(`kdh-dev`)이라 이름 매칭이 어려웠는데, Jira는 표시 이름이 한글이라 오히려 우리 DB와 더 매칭이 쉬울 수 있음.

---

## 8. 엔드포인트 (우리 서버가 노출하는 API)

### 8-1. 동기화 실행

```
POST /api/integrations/jira/sync
```

**요청 body** (생략 가능)
```json
{ "project_key": "INFRA" }
```

**응답**
```json
{
  "success": true,
  "data": {
    "synced_at": "2026-08-25T10:30:00Z",
    "issues_fetched": 8,
    "evidence_created": 3,
    "unmatched_count": 2,
    "logs_recorded": 8
  }
}
```

**예외**
- 인증 실패(이메일/토큰 오류) → `401 UNAUTHORIZED`
- 프로젝트 키 없음 → `404 NOT_FOUND`
- Jira 요청 한도 초과 → `429`

### 8-2. 마지막 동기화 상태 조회

```
GET /api/integrations/jira/sync/status
```
GitHub 문서의 7-2와 동일한 형태로 응답.

---

## 9. 데이터 모델 관련 이슈 — GitHub과 다른 점

GitHub은 기존 `nodes`/`collection_logs` 스키마로 충분했는데, Jira는 **description 원문(ADF 파싱 결과)을 저장할 곳이 애매하다.**

- `nodes.title`은 `VARCHAR(500)`이라 긴 설명을 다 담기엔 부족할 수 있음
- 옵션 A: `nodes.title`에는 `summary`만 넣고, description은 그냥 버림 (가장 간단, 정보 손실 있음)
- 옵션 B: `collection_logs.raw_content`(TEXT 타입)에 description 전체를 저장해두고, `nodes.title`은 summary만 사용 — **이 방식을 권장**. 상세 내용이 궁금하면 collection_logs를 참조하면 됨

---

## 10. 화면 ↔ API 매핑

| 화면 | 동작 | API |
|---|---|---|
| F1 | Jira 연동 카드에 "지금 동기화" 버튼(신규 추가 필요) | `POST /api/integrations/jira/sync` |
| F1 | 마지막 동기화 시각 표시(신규 추가 필요) | `GET /api/integrations/jira/sync/status` |

> GitHub과 마찬가지로, 현재 Relay HTML의 F1 화면엔 이 버튼이 없어서 프론트 작업이 별도로 필요함.

---

## 11. 향후 확장 (이번 범위 밖)

- **웹훅 기반 실시간 반영**: 서버 배포 후, Jira 프로젝트 설정 → Webhooks에서 이슈 생성/수정 이벤트 등록
- **ADF 원문 저장 구조 개선**: `nodes`에 별도 `detail` 컬럼(TEXT)을 추가해서, `collection_logs`를 거치지 않고도 노드 자체에서 상세 내용 조회 가능하게 (9번 옵션 A/B 대신 옵션 C)
- **GitHub PR ↔ Jira 티켓 자동 연결**: 6번에서 언급한 티켓 번호 패턴 매칭 로직 추가
