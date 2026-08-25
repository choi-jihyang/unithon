# Figma 연동 API 설계 문서

버전: v1
기준: docs/api/api-contract.md v2 + db-schema-design.md + docs/api/github-integration-api.md, jira-integration-api.md (동일 패턴 참고)
목적: Figma 댓글(코멘트) 데이터를 가져와 `nodes` 및 `collection_logs`로 변환

> ⚠️ 원 요청에는 "커밋내역과 PR 내역"이라고 되어 있었는데, Figma에는 커밋/PR 개념이 없음. Figma는 디자인 파일에 달리는 **댓글(코멘트)**을 다루므로, 이 문서에서는 "댓글/코멘트 내역"으로 대체해서 작성함. 버전 히스토리 연동은 12번(향후 확장)에 남겨둠.

> ⚠️ **설계 변경 이력**: 이전 분석 단계(`data-sources-mapping.md`)에서는 Figma 댓글이 "~해도 되나요?" 같은 질문형 문장이 많아 미분류 큐(사람이 확인 후 분류)로 보내는 게 자연스럽다고 판단했었음. 하지만 최신 Relay HTML(F1 화면)에서 Figma가 GitHub·Jira와 같은 "구조화 소스" 그룹으로 재분류되었고, `db-schema-design.md`에도 이미 반영됨. 이 문서는 **최신 결정(구조화 소스, 규칙 기반 자동 분류)을 기준**으로 작성함.

---

## 1. 개요

Figma 파일의 댓글을 가져와서, 규칙 기반으로 분류한 뒤 우리 그래프(`nodes`, `relationships`)에 반영하는 기능이다. 구조화 소스로 분류되므로 `unclassified_queue`를 거치지 않고 바로 `nodes`에 반영된다.

### 트리거 방식 — 수동 동기화 (GitHub·Jira와 동일한 이유)

⚠️ **가정**: 우리 서버가 `localhost`라 외부에서 접근 가능한 주소가 없어 Figma의 실시간 알림(웹훅)을 받을 수 없다. GitHub·Jira 문서와 동일하게 **"버튼을 누르면 그 시점 데이터를 가져오는 수동 동기화" 방식**으로 진행한다.

---

## 2. 사전 설정

### 환경변수

```properties
# application.properties
figma.token=${FIGMA_TOKEN}
```

### GitHub·Jira와 인증 방식이 또 다름 (세 번째 패턴)

| | GitHub | Jira | Figma |
|---|---|---|---|
| 인증 헤더 | `Authorization: Bearer {TOKEN}` | `Authorization: Basic {Base64(email:token)}` | `X-FIGMA-TOKEN: {TOKEN}` (커스텀 헤더, Bearer 아님) |
| 토큰 발급 위치 | GitHub Settings | Atlassian 계정 설정 | Figma → Settings → Personal access tokens |

```java
headers.set("X-FIGMA-TOKEN", figmaToken);
```

---

## 3. 데이터 흐름

```
[동기화 버튼 클릭]
    ↓
POST /api/integrations/figma/sync
    ↓
① Figma API: GET /v1/files/{file_key}/comments
    ↓
② 각 댓글을 collection_logs에 원본 기록
    ↓
③ 규칙 기반 분류 (6번 섹션 참고)
    ↓
④ 조건에 맞으면 nodes 테이블에 evidence로 저장
    ↓
⑤ relationships로 project ↔ node 연결
    ↓
⑥ 동기화 결과 응답으로 반환
```

---

## 4. 사용할 Figma API 엔드포인트

### 요청

```
GET https://api.figma.com/v1/files/{file_key}/comments
X-FIGMA-TOKEN: {FIGMA_TOKEN}
```

⚠️ GitHub·Jira는 "저장소/프로젝트 키"만 알면 됐는데, Figma는 **`file_key`(파일 고유 식별자)** 단위로 조회한다. 저장소 개념이 아니라 "파일" 개념이라는 게 다른 점.

### 응답 형태

```json
{
  "comments": [
    {
      "id": "1234567890",
      "user": { "handle": "정하은" },
      "created_at": "2025-07-02T09:20:11.000Z",
      "resolved_at": null,
      "message": "환불 완료 화면에 승인 단계 안내 문구 빼도 되나요? 백엔드 로직 확인 필요"
    }
  ]
}
```

### 우리가 실제로 뽑아 쓰는 필드

| Figma 필드 | 우리 쪽 매핑 대상 |
|---|---|
| `id` | `nodes.evidence_ref` (예: `#fg-1234567890`) |
| `user.handle` | 사용자 매칭용 |
| `message` | `nodes.title` |
| `created_at` | `nodes.made_at` |
| `resolved_at` | 분류 조건 판단용 (6번 참고), DB 저장은 안 함 |

---

## 5. 프로젝트 매칭 규칙

Figma 댓글 응답에는 프로젝트 코드 정보가 없다. GitHub(라벨 추론), Jira(`project.key` 직접 제공)와 또 다른 상황 — **파일 하나가 대체로 프로젝트 하나에 대응한다는 전제로, `file_key` 자체를 매핑 키로 사용**한다.

```properties
figma.project-mapping.abc123fileKey=PJ-014
figma.project-mapping.def456fileKey=PJ-021
```

매핑에 없는 `file_key`의 댓글은 GitHub·Jira와 동일하게 `collection_logs`에만 기록.

---

## 6. 분류 규칙

GitHub의 "PR이 병합됐는가", Jira의 "티켓이 Resolved인가"와 같은 원칙을 Figma에도 동일하게 적용한다: **"논의가 끝났다고 볼 수 있는 것만 노드로 만든다."**

| 조건 | 처리 |
|---|---|
| `resolved_at`이 값이 있음 (논의 종결) | `nodes`에 `node_type=evidence`로 저장 |
| `resolved_at`이 `null` (아직 논의 중) | `collection_logs`에만 기록, `nodes`엔 안 넣음 |

### 왜 decision/reason이 아니라 evidence로 고정하는지

- Figma 댓글 API는 "무엇을 결정했는지"의 결론 자체는 알려주지 않고, "논의가 있었다/끝났다"만 알려준다 (`resolved_at` 유무).
- 그래서 GitHub의 PR(제목=decision, 본문=reason)처럼 두 종류로 쪼갤 근거가 없어서, **모두 evidence(디자인 논의 근거 자료)로 통일**한다.
- 참고: `message` 자체가 질문형 문장("~해도 되나요?")인 경우가 많다는 건 여전히 유효한 관찰이라, evidence 노드로 만들어도 **내용 자체는 "결론"이 아니라 "논의가 있었다는 기록"**이라는 걸 감안해서 화면에서 오해 없이 보이는지는 실제 데모 때 확인 필요.

---

## 7. 사용자 매칭

`user.handle`(Figma 표시 이름)과 `users.name`을 완전 일치로 매칭. GitHub·Jira와 동일한 패턴.

---

## 8. 엔드포인트 (우리 서버가 노출하는 API)

### 8-1. 동기화 실행

```
POST /api/integrations/figma/sync
```

**요청 body** (생략 가능)
```json
{ "file_key": "abc123fileKey" }
```

**응답**
```json
{
  "success": true,
  "data": {
    "synced_at": "2026-08-25T10:30:00Z",
    "comments_fetched": 5,
    "evidence_created": 2,
    "unmatched_count": 1,
    "logs_recorded": 5
  }
}
```

**예외**
- 토큰 오류 → `401 UNAUTHORIZED`
- 파일 없음/권한 없음 → `404 NOT_FOUND`

### 8-2. 마지막 동기화 상태 조회

```
GET /api/integrations/figma/sync/status
```
GitHub·Jira 문서와 동일한 형태.

---

## 9. 데이터 모델 관련 이슈

GitHub·Jira와 마찬가지로 기존 `nodes`/`collection_logs` 스키마로 충분하다. 추가 이슈는 없음 — Figma 댓글은 GitHub 커밋 메시지처럼 짧은 평문이라 ADF 파싱 같은 별도 처리가 필요 없다.

---

## 10. 화면 ↔ API 매핑

| 화면 | 동작 | API |
|---|---|---|
| F1 | Figma 연동 카드에 "지금 동기화" 버튼(신규 추가 필요) | `POST /api/integrations/figma/sync` |
| F1 | 마지막 동기화 시각 표시(신규 추가 필요) | `GET /api/integrations/figma/sync/status` |

> GitHub·Jira와 마찬가지로, 현재 Relay HTML의 F1 화면엔 이 버튼이 없어서 프론트 작업이 별도로 필요함.

---

## 11. 세 소스(GitHub·Jira·Figma) 비교 요약

| | GitHub | Jira | Figma |
|---|---|---|---|
| 인증 방식 | Bearer 토큰 | Basic(이메일+토큰) | 커스텀 헤더(X-FIGMA-TOKEN) |
| 조회 단위 | 저장소(owner/repo) | 프로젝트(project key) | 파일(file_key) |
| 프로젝트 매칭 | 라벨/태그 추론 | project.key 직접 제공 | file_key 매핑 테이블 |
| 생성되는 노드 타입 | decision + reason | evidence | evidence |
| 노드 생성 조건 | PR 병합됨 | 티켓 Resolved | 댓글 resolved_at 있음 |
| description 파싱 | 평문 그대로 | ADF 재귀 파싱 필요 | 평문 그대로 |

---

## 12. 향후 확장 (이번 범위 밖)

- **웹훅 기반 실시간 반영**: 서버 배포 후 Figma 웹훅(파일 업데이트, 댓글 이벤트) 등록
- **버전 히스토리 연동**: 댓글뿐 아니라 파일의 버전 히스토리(`GET /v1/files/{file_key}/versions`)도 가져와서, 디자인이 실제로 언제 바뀌었는지까지 근거로 활용
- **`message` 질문형 문장 여부를 LLM으로 재판별**: `resolved_at` 유무만으로는 "진짜 결론 있는 근거"인지 "그냥 논의가 흐지부지 끝난 것"인지 구분이 안 되므로, 정확도를 높이려면 추가 판별 로직 고려 가능
