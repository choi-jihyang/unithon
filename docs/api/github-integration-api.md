# GitHub 연동 API 설계 문서

버전: v1
기준: docs/api/api-contract.md v2 + db-schema-design.md
목적: GitHub 커밋/PR 데이터를 가져와 `nodes`(결정/이유/근거) 및 `collection_logs`로 변환

---

## 1. 개요

GitHub 저장소의 커밋과 PR을 가져와서, 규칙 기반으로 분류한 뒤 우리 그래프(`nodes`, `relationships`)에 반영하는 기능이다. GitHub은 "구조화 소스"로 분류되므로, `unclassified_queue`를 거치지 않고 바로 `nodes`에 반영된다.

### 트리거 방식 — 이번 범위는 수동 동기화

⚠️ **가정**: GitHub이 우리 서버로 이벤트를 실시간으로 밀어주는 방식(웹훅)은 우리 서버가 공개 인터넷 주소(`localhost`가 아닌 URL)를 가져야 동작한다. 지금은 로컬 개발 환경이라 이 조건을 못 맞추므로, **이번 설계는 "버튼을 누르면 그 시점에 최신 데이터를 가져오는 수동 동기화" 방식**으로 진행한다. 실시간 자동 반영(웹훅)은 8번 섹션에 향후 확장으로 남겨둔다.

---

## 2. 사전 설정

### 환경변수 (DB_PASSWORD와 동일한 패턴)

```properties
# application.properties
github.token=${GITHUB_TOKEN}
github.default-owner=${GITHUB_OWNER:choi-jihyang}
github.default-repo=${GITHUB_REPO:unithon}
```

### 필요한 GitHub 토큰 권한

Personal Access Token 발급 시 `repo` 권한(비공개 저장소면 필수, 공개 저장소면 `public_repo`만으로도 가능) 체크.

---

## 3. 데이터 흐름

```
[동기화 버튼 클릭]
    ↓
POST /api/integrations/github/sync
    ↓
① GitHub API: GET /repos/{owner}/{repo}/commits (커밋 목록)
② GitHub API: GET /repos/{owner}/{repo}/pulls?state=closed (병합된 PR 목록)
    ↓
③ 각 커밋/PR을 collection_logs에 원본 기록
    ↓
④ 규칙 기반 분류 (5번 섹션 참고)
    ↓
⑤ 조건에 맞으면 nodes 테이블에 decision/reason 저장
    ↓
⑥ relationships로 project ↔ node 연결
    ↓
⑦ 동기화 결과(몇 건 처리했는지) 응답으로 반환
```

---

## 4. 프로젝트 매칭 규칙 (중요 — 설계 가정)

우리 DB엔 프로젝트가 여러 개(PJ-014, PJ-021, PJ-033...) 있는데, GitHub에서 가져온 커밋/PR이 **어느 프로젝트 것인지 구분**해야 한다.

⚠️ **가정**: PR에 프로젝트 코드를 라벨로 붙이는 규칙을 쓴다고 가정한다.
- PR에 `PJ-014` 같은 라벨이 붙어있으면 → 그 프로젝트로 매칭
- 라벨이 없으면 → PR 제목/본문에서 `[PJ-014]` 같은 대괄호 태그를 찾아서 매칭
- 커밋은 PR과 연결된 경우 그 PR의 프로젝트를 따라가고, PR과 연결 안 된 단독 커밋은 **매칭 실패로 처리하고 `collection_logs`에만 기록** (nodes에는 안 넣음)

> 이 규칙은 팀 내에서 실제로 라벨/태그 컨벤션을 쓸지 확인이 필요하다. 확인 전까지는 데모용으로 `github.default-project-id` 환경변수를 하나 더 두고, 매칭 실패 시 이 기본 프로젝트로 임시 배정하는 방식으로 두는 것도 대안.

---

## 5. 분류 규칙

### 커밋 → `decision` 노드

| 조건 | 처리 |
|---|---|
| 커밋 메시지가 `feat:`로 시작 | `nodes`에 `node_type=decision`으로 저장 |
| `fix:`, `chore:`, `docs:` 등 그 외 | `collection_logs`에만 기록 (decision 생성 안 함) |

### PR → `decision` + `reason` 노드 (병합된 PR만 대상)

PR은 커밋보다 정보가 풍부해서, **제목은 decision, 본문은 reason**으로 나눠서 저장한다.

| PR 필드 | 매핑 대상 |
|---|---|
| `title` | `decision` 노드의 `title` |
| `body` | `reason` 노드의 `title` (본문 전체 또는 요약) |
| `merged_at` | 두 노드의 `made_at` |
| `number` | `evidence_ref`에 `#142` 형식으로 저장 |
| `user.login` | `made_by_user_id` 매칭용 (이름 매핑 필요, 6번 참고) |

같은 PR에서 나온 decision과 reason은 `relationships`로 `이유` 관계 연결.

### 커밋과 PR이 겹치는 경우

같은 내용이 커밋 메시지와 PR 양쪽에 다 있을 수 있어서, **PR이 있는 커밋은 커밋 단독 분류를 건너뛰고 PR 쪽 처리만 적용**한다 (중복 생성 방지).

---

## 6. 사용자 매칭

GitHub 계정 이름(`author.name` 또는 `user.login`)과 우리 `users` 테이블의 `name`을 **문자열 완전 일치**로 매칭한다.

- 일치하는 사용자가 있으면 → `made_by_user_id`에 반영
- 없으면 → `made_by_user_id`를 NULL로 두고 저장 (매칭 실패해도 데이터 자체는 유실하지 않음)

> 참고: 이 방식은 GitHub 계정명과 우리 시스템의 이름이 정확히 같아야 매칭된다. 다르면 매번 실패하니, 팀원들 이름을 GitHub 계정명과 맞춰두거나, 추후 별도 매핑 테이블을 고려할 수 있다.

---

## 7. 엔드포인트

### 7-1. 동기화 실행

```
POST /api/integrations/github/sync
```

**요청 body** (생략 가능, 생략 시 환경변수 기본값 사용)
```json
{ "owner": "choi-jihyang", "repo": "unithon" }
```

**응답**
```json
{
  "success": true,
  "data": {
    "synced_at": "2026-08-25T10:30:00Z",
    "commits_fetched": 12,
    "prs_fetched": 4,
    "decisions_created": 3,
    "reasons_created": 3,
    "unmatched_count": 2,
    "logs_recorded": 16
  }
}
```
- `unmatched_count`: 프로젝트 매칭 실패해서 `collection_logs`에만 기록되고 `nodes`엔 안 들어간 개수

**비즈니스 규칙**
- 같은 커밋/PR을 중복 동기화해도 `nodes`에 중복 생성되지 않아야 함 (커밋 `sha`, PR `number`를 기준으로 이미 처리된 것인지 확인 후 스킵)

**예외**
- GitHub 토큰이 없거나 만료됨 → `401 UNAUTHORIZED`, `error.message: "GitHub 인증에 실패했습니다"`
- GitHub API 요청 한도 초과 → `429`, `error.message: "GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요"`
- 저장소를 찾을 수 없음 → `404 NOT_FOUND`

### 7-2. 마지막 동기화 상태 조회

```
GET /api/integrations/github/sync/status
```

**응답**
```json
{
  "success": true,
  "data": {
    "last_synced_at": "2026-08-25T10:30:00Z",
    "last_result": {
      "commits_fetched": 12,
      "prs_fetched": 4,
      "decisions_created": 3
    }
  }
}
```
- 한 번도 동기화 안 했으면 `last_synced_at: null`

---

## 8. 데이터 모델 추가 필요사항

기존 `db-schema-design.md`의 `collection_logs`, `nodes` 테이블은 이미 이 기능을 지원하도록 설계되어 있어서 **테이블 추가 변경 없이 그대로 사용 가능**하다. 다만 아래 값을 명확히 채워야 한다:

- `nodes.source` = `'github'`
- `nodes.evidence_ref` = PR 번호(`#142`) 또는 커�밋 sha 앞 7자리
- `collection_logs.source` = `'github'`
- `collection_logs.raw_content` = 커밋 메시지 원문 또는 PR title+body

**동기화 중복 방지용 추가 고려사항**: 이미 처리된 커밋/PR인지 확인하려면 `nodes` 또는 `collection_logs`에 `evidence_ref`(또는 별도 `external_id` 컬럼)로 중복 조회 가능해야 함. 현재 스키마에 `evidence_ref`가 있으니 이걸로 조회 가능 — 별도 컬럼 추가는 불필요.

---

## 9. 화면 ↔ API 매핑

| 화면 | 동작 | API |
|---|---|---|
| F1 | GitHub 연동 카드에 "지금 동기화" 버튼(신규 추가 필요) | `POST /api/integrations/github/sync` |
| F1 | 연동 카드에 마지막 동기화 시각 표시(신규 추가 필요) | `GET /api/integrations/github/sync/status` |

> 참고: 현재 Relay HTML의 F1 화면에는 "동기화" 버튼이 없다. 이 기능을 실제로 쓰려면 F1 화면에 버튼을 추가하는 프론트 작업이 별도로 필요하다.

---

## 10. 향후 확장 (이번 범위 밖)

- **웹훅 기반 실시간 반영**: 서버가 공개 URL을 가지면(배포 후), GitHub Repository Settings → Webhooks에 `push`, `pull_request` 이벤트를 등록해서 커밋/PR 발생 즉시 우리 서버로 알림이 오도록 전환 가능. 이 경우 `POST /api/webhooks/github` 같은 별도 수신 엔드포인트가 필요하며, GitHub이 보내는 서명(`X-Hub-Signature-256`) 검증 로직도 추가해야 함
- **주기적 자동 동기화**: 웹훅 대신 서버가 몇 분마다 스스로 GitHub을 확인하는 방식(Spring `@Scheduled`)도 대안이 될 수 있음
- 프로젝트 매칭을 라벨/태그가 아닌 AI 기반 추론으로 고도화
