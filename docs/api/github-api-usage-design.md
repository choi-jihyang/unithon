# GitHub API 사용 설계 문서

버전: v1
목적: `GitHubService`가 실제로 GitHub REST API를 호출할 때 필요한 인증, 엔드포인트, 요청/응답 스펙 정리
관련 문서: `docs/api/github-integration-api.md` (우리 서버가 노출하는 API), `docs/db-schema-design.md`

---

## 1. 개요

우리 백엔드가 GitHub의 API를 **호출하는 쪽(클라이언트)**이 되어 사용할 엔드포인트는 2개다:

1. **커밋 목록 조회** — `GET /repos/{owner}/{repo}/commits`
2. **PR 목록 조회** — `GET /repos/{owner}/{repo}/pulls`

이 문서는 이 2개 엔드포인트를 호출할 때 필요한 인증 방식, 요청 형식, 응답에서 실제로 우리가 쓸 필드를 순서대로 정리한다.

---

## 2. 인증

### 요청 헤더

```
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json
```

- `GITHUB_TOKEN`은 `application.properties`에 환경변수로 등록 (`DB_PASSWORD`와 동일한 패턴, git에 노출 금지)
- 공개 저장소만 대상이면 토큰 없이도 호출 가능하지만, **요청 한도가 훨씬 낮아지므로(시간당 60회) 토큰 사용을 기본으로 함**
- 토큰 있을 경우 요청 한도: 시간당 5,000회

### 토큰 발급 경로 (참고용, 팀원 안내용)

GitHub → Settings → Developer settings → Personal access tokens → Generate new token (Classic) → `repo`(비공개 저장소 접근) 또는 `public_repo`(공개 저장소만) 권한 체크

---

## 3. 엔드포인트 ① — 커밋 목록 조회

### 요청

```
GET https://api.github.com/repos/{owner}/{repo}/commits?per_page=30&page=1
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json
```

**쿼리 파라미터**
| 파라미터 | 설명 | 기본값 |
|---|---|---|
| `per_page` | 한 번에 가져올 개수 (최대 100) | 30 |
| `page` | 페이지 번호 | 1 |
| `since` | 이 시각 이후 커밋만 (ISO 8601) | 없음 |

⚠️ **`since` 파라미터를 동기화에 활용할 것을 권장**: 매번 전체 커밋을 다 가져오지 않고, `GET /api/integrations/github/sync/status`에 저장된 `last_synced_at` 이후 것만 가져오면 중복 처리 부담이 줄어든다.

### 응답 형태 (배열)

```json
[
  {
    "sha": "6dcb09b5b57875f334f61aebed695e2e4193db5e",
    "html_url": "https://github.com/{owner}/{repo}/commit/6dcb09b5...",
    "commit": {
      "message": "feat: OAuth2 기반 인증으로 전환",
      "author": {
        "name": "Kim Dohyun",
        "email": "kdh@example.com",
        "date": "2025-05-07T09:14:23Z"
      }
    },
    "author": {
      "login": "kdh-dev"
    }
  }
]
```
※ 실제 GitHub 응답에는 이 외에도 `node_id`, `parents`, `verification`, `committer` 등 필드가 훨씬 많이 포함되지만, 우리가 실제로 쓰는 건 아래 표의 5개뿐이다.

### 우리가 실제로 뽑아 쓰는 필드

| GitHub 필드 | 우리 쪽 매핑 대상 |
|---|---|
| `sha` | `nodes.evidence_ref` (앞 7자리만 잘라서 `#6dcb09b` 형식으로) |
| `commit.message` | `collection_logs.raw_content`, 조건 충족 시 `nodes.title` |
| `commit.author.name` | 사용자 매칭용 (users.name과 대조) |
| `commit.author.date` | `nodes.made_at`, `collection_logs.occurred_at` |
| `html_url` | (선택) 참고 링크로 보관하고 싶다면 별도 컬럼 필요 — 현재 스키마엔 없음, 필요시 추가 검토 |

---

## 4. 엔드포인트 ② — PR 목록 조회

### 요청

```
GET https://api.github.com/repos/{owner}/{repo}/pulls?state=closed&per_page=30&page=1
Authorization: Bearer {GITHUB_TOKEN}
Accept: application/vnd.github+json
```

**쿼리 파라미터**
| 파라미터 | 설명 |
|---|---|
| `state` | `open`\|`closed`\|`all`. **병합된 PR만 필요하므로 `closed` 사용** (단, closed에는 "병합 안 되고 그냥 닫힌 PR"도 섞여있어서 5번에서 추가 필터링 필요) |
| `per_page`, `page` | 위와 동일 |

### 응답 형태 (배열)

```json
[
  {
    "number": 142,
    "title": "OAuth2 마이그레이션",
    "body": "이유: 자체 세션 관리 방식에서 토큰 재사용 취약점이 지적되어, 검증된 표준 프로토콜로 이전",
    "state": "closed",
    "merged_at": "2025-05-08T14:22:00Z",
    "html_url": "https://github.com/{owner}/{repo}/pull/142",
    "user": {
      "login": "kdh-dev"
    },
    "labels": [
      { "name": "PJ-014" }
    ]
  }
]
```

### 우리가 실제로 뽑아 쓰는 필드

| GitHub 필드 | 우리 쪽 매핑 대상 |
|---|---|
| `number` | `nodes.evidence_ref` (`#142` 형식) |
| `title` | decision 노드의 `title` |
| `body` | reason 노드의 `title` |
| `merged_at` | 두 노드의 `made_at` — **null이면 아직 병합 안 된 PR이므로 처리 대상에서 제외** (5번 필터링 규칙) |
| `user.login` | 사용자 매칭용 |
| `labels[].name` | 프로젝트 매칭용 (github-integration-api.md 4번 섹션 규칙) |

---

## 5. 응답 처리 순서 (필터링 규칙)

PR 목록을 가져온 후, 실제로 처리 대상인지 아래 순서로 판단한다:

```
1. merged_at이 null인가?
   → YES: 병합 안 된 PR (그냥 닫히기만 함) → 무시, collection_logs에도 기록 안 함
   → NO: 다음 단계로

2. labels에서 프로젝트 코드(PJ-XXX 형식)를 찾을 수 있는가?
   → NO: collection_logs에만 기록 (매칭 실패로 표시), nodes엔 안 넣음
   → YES: 다음 단계로

3. 같은 PR number로 이미 처리된 기록이 있는가? (nodes.evidence_ref로 조회)
   → YES: 스킵 (중복 방지)
   → NO: nodes에 decision + reason 저장, relationships 연결
```

커밋도 동일한 원칙(3번 중복 체크)을 적용하되, 1·2번 대신 "커밋 메시지가 `feat:`로 시작하는가", "PR과 연결된 커밋인가"를 확인한다 (`github-integration-api.md` 5번 섹션 참고).

---

## 6. 페이지네이션 처리

한 번의 요청으로 최대 100개까지만 오므로, 커밋/PR이 100개 넘으면 여러 페이지를 순회해야 한다.

```
1. page=1로 요청
2. 응답 배열 길이가 per_page(예: 100)와 같으면 → 다음 페이지 있을 가능성 있음 → page+1로 재요청
3. 응답 배열 길이가 per_page보다 작으면 → 마지막 페이지
```

⚠️ 해커톤 데모 규모(레포 하나, 며칠간 활동)에서는 첫 페이지(30~100개)만으로 충분할 가능성이 높다. 페이지네이션 전체 구현은 필수 우선순위는 아니고, **1페이지만 처리하고 로그에 "더 있을 수 있음" 표시하는 정도로 단순화해도 무방**.

---

## 7. 에러 케이스

| 상황 | GitHub 응답 | 우리 쪽 처리 |
|---|---|---|
| 토큰 없음/만료 | `401 Bad credentials` | `POST /sync` 응답을 `401 UNAUTHORIZED`로 매핑 |
| 저장소 없음/권한 없음 | `404 Not Found` | `404 NOT_FOUND`로 매핑 |
| 요청 한도 초과 | `403` + 헤더 `X-RateLimit-Remaining: 0` | `429`로 매핑, 헤더의 `X-RateLimit-Reset`(초 단위 UNIX 타임스탬프)을 읽어서 "언제 다시 시도 가능한지" 메시지에 포함 가능 |

---

## 8. 실제 호출 순서 요약 (GitHubService 구현 시 참고)

```
1. GET /repos/{owner}/{repo}/commits (since=last_synced_at)
   → 각 커밋을 collection_logs에 기록
   → "feat:"로 시작 & 아직 미처리 & PR과 연결 안 된 것만 nodes에 저장

2. GET /repos/{owner}/{repo}/pulls?state=closed (since 파라미터 없음 - PR 목록 API는 since 미지원, 
   대신 merged_at으로 클라이언트에서 직접 필터링)
   → merged_at 있는 것만 대상
   → 라벨에서 프로젝트 코드 찾기
   → 아직 미처리(evidence_ref로 중복 체크)면 nodes에 decision+reason 저장

3. 결과 집계 (commits_fetched, prs_fetched, decisions_created 등)
   → github-integration-api.md의 7-1 응답 형식으로 반환
```

---

## 9. 다음 단계

이 문서 기준으로 Claude Code에 아래 순서로 구현 요청 가능:
1. `GitHubApiClient` — 순수하게 GitHub API 호출 + JSON 파싱만 담당 (이 문서의 3, 4번 섹션)
2. `GitHubSyncService` — 필터링/분류/DB 저장 담당 (이 문서의 5번 섹션 + `github-integration-api.md` 5번)
3. `GitHubIntegrationController` — `POST /sync`, `GET /sync/status` 엔드포인트 (`github-integration-api.md` 7번)
