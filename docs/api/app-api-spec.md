외부 시스템 연동 스펙

screen-features.md의 미결 항목 "연동수집(F1) 항목별 데이터가 어떤 형태로 떨어지는지 정의"에 대한 답. F1 연동수집이 다루는 4개 소스(GitHub/Slack/Jira/Notion) 중 구조화된 소스 2종(Jira, GitHub)만 우선 구현, Slack/Notion은 이번 범위 밖.

프론트-백엔드 자체 API 계약(F1~F6, getContext 등)은 [api-spec.md](./api-spec.md) 참고. 이 문서는 외부 서비스(Jira/GitHub)에서 데이터를 가져와 그래프 노드로 매핑하는 연동 스펙만 다룬다.

---

## Jira 연동

### 1. 인증
Jira Cloud + API 토큰 방식 사용 (OAuth 불필요). Basic Auth 헤더 = base64({이메일}:{API 토큰}).
필요 설정값 3개 — application.properties에 등록:
jira.base-url=https://{사이트명}.atlassian.net
jira.email={계정 이메일}
jira.api-token={API 토큰}
무료 Jira Cloud 사이트 하나 생성 후, 더미 프로젝트(예: PJ-014)에 이슈·코멘트를 API로 시드해서 데모용 데이터 구성. 필드명/구조는 실제 Jira 응답 스키마 그대로 유지 (임의 변경 금지 — 나중에 실 연동 전환 시 매핑 로직 재사용 목적).

### 2. 원본 데이터 소스 (Jira REST API v3)
GET /rest/api/3/search?jql=project={key} — 이슈 목록
GET /rest/api/3/issue/{issueIdOrKey} — 이슈 상세 (fields.summary, fields.description, fields.status, fields.assignee)
GET /rest/api/3/issue/{issueIdOrKey}/comment — 코멘트 목록
GET /rest/api/3/issue/{issueIdOrKey}/changelog — 상태 전이 이력

### 3. 필드 → 그래프 매핑 규칙 (결정/이유/근거)
fields.summary → decision(결정) — 이슈 생성 시 1건 생성
fields.description → reason(이유) — 이슈 설명 본문 그대로 사용
comment.body → reason 또는 evidence — js/classifier.js와 동일한 규칙 재사용: "왜냐하면"/"때문에" 등 포함 시 reason, URL·티켓번호 포함 시 evidence. 애매하면 미분류 큐로 (1-2 수집 로그 뷰어에서 확인)
changelog.items (status 전이) → evidence — "상태: {fromString} → {toString}" 형태로 텍스트 생성
issue.self / issue.key → evidence_source — https://{사이트명}.atlassian.net/browse/{key} 형태로 통일 (프론트에서 "근거" 클릭 시 이동할 링크이므로 항상 이 포맷 유지)

### 4. 수집 로그(1-2) 반영 규칙
이슈 1건 생성 시 로그 1건: "{담당자} 님이 티켓 {key} 생성 → 결정 노드 생성"
코멘트 1건당 분류 성공 시 로그 1건: "티켓 {key} 코멘트 → {reason|evidence} 노드 연결"
분류 실패(unknown) 시: 그래프 노드 생성 보류, 미분류 큐에만 적재

### 5. 백엔드 API (신규)

POST /api/integrations/jira/sync — Jira 수집 동기화 (더미 데이터 기준 수동 트리거, 실 서비스에서는 폴링으로 대체 가능)
요청:

{ "projectKey": "PJ-014" }
응답:

{ "issuesFetched": 12, "commentsFetched": 34, "entitiesCreated": 9, "unclassified": 3 }
동작: 2~4번 규칙대로 entities/relations 생성 + 수집 로그(1-2)에 반영. 1-1 화면에서 해당 유저의 Jira 토글이 OFF면 아무 것도 하지 않고 { "skipped": true } 반환.

GET /api/integrations/jira/status — 1-1 연동 설정 화면용 상태 조회
요청: 없음 (세션 유저 기준)
응답:

{ "connected": true, "toggledOn": true, "lastSyncedAt": "2026-08-20T09:00:00" }

### 전달 시 꼭 확인해야 할 것 (Jira)
evidence_source는 항상 이슈 브라우저 링크(/browse/{key}) 형태로 통일 — 형태가 다르면 F3 "근거" 클릭 시 깨짐
코멘트 분류 키워드 규칙은 GitHub 연동과 동일한 js/classifier.js를 그대로 재사용할 예정이므로, 새 키워드 추가 시 프론트팀과 공유 필요
더미데이터 시드 시에도 실제 Jira REST API 응답 필드명을 그대로 써야 함 (예: fields.summary를 summary로 바꾸지 말 것)

---

## GitHub 연동

### 1. 인증
GitHub REST API v3 + Personal Access Token(PAT, fine-grained) 방식 사용 (OAuth App 불필요). 헤더 = Authorization: Bearer {토큰}.
필요 설정값 3개 — application.properties에 등록:
github.api-base-url=https://api.github.com
github.token={Personal Access Token}
github.repo={owner}/{repo}
무료 개인 GitHub 계정으로 더미 리포지토리 하나 생성 후, 커밋·PR·리뷰 코멘트를 API로 시드해서 데모용 데이터 구성. 필드명/구조는 실제 GitHub 응답 스키마 그대로 유지 (임의 변경 금지 — 나중에 실 연동 전환 시 매핑 로직 재사용 목적).

### 2. 원본 데이터 소스 (GitHub REST API v3)
GET /repos/{owner}/{repo}/commits — 커밋 목록 (commit.message, commit.author, html_url)
GET /repos/{owner}/{repo}/pulls?state=all — PR 목록 (title, body, html_url)
GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews — 코드리뷰 승인/요청 이력
GET /repos/{owner}/{repo}/issues/{pull_number}/comments — PR 코멘트 (GitHub API 특성상 PR 코멘트도 issues comments 엔드포인트 사용)

### 3. 필드 → 그래프 매핑 규칙 (결정/이유/근거)
pull_request.title → decision(결정) — PR 생성 시 1건 생성
pull_request.body → reason(이유) — PR 설명 본문 그대로 사용
commit.message → decision 후보 — Conventional Commits 프리픽스(feat:/fix:/refactor: 등)가 있을 때만 decision으로 채택, 없으면 미분류 큐
comment.body (PR 코멘트/리뷰 코멘트) → reason 또는 evidence — js/classifier.js와 동일한 규칙 재사용 (Jira와 동일 기준: "왜냐하면"/"때문에" → reason, URL·이슈번호 포함 → evidence)
commit.html_url / pull_request.html_url → evidence_source — https://github.com/{owner}/{repo}/{commit|pull}/{sha|number} 형태 그대로 사용

### 4. 수집 로그(1-2) 반영 규칙
PR 1건 생성 시 로그 1건: "{담당자} 님이 PR #{number} 생성 → 결정 노드 생성"
컨벤셔널 커밋 1건당 로그 1건: "{담당자} 님이 커밋 {shortSha} 푸시 → 결정 노드 생성"
코멘트 1건당 분류 성공 시 로그 1건: "PR #{number} 코멘트 → {reason|evidence} 노드 연결"
분류 실패(unknown) 시: 그래프 노드 생성 보류, 미분류 큐에만 적재

### 5. 백엔드 API (신규)

POST /api/integrations/github/sync — GitHub 수집 동기화 (더미 데이터 기준 수동 트리거, 실 서비스에서는 웹훅/폴링으로 대체 가능)
요청:

{ "repo": "owner/repo" }
응답:

{ "commitsFetched": 20, "pullRequestsFetched": 6, "entitiesCreated": 11, "unclassified": 4 }
동작: 2~4번 규칙대로 entities/relations 생성 + 수집 로그(1-2)에 반영. 1-1 화면에서 해당 유저의 GitHub 토글이 OFF면 아무 것도 하지 않고 { "skipped": true } 반환.

GET /api/integrations/github/status — 1-1 연동 설정 화면용 상태 조회
요청: 없음 (세션 유저 기준)
응답:

{ "connected": true, "toggledOn": true, "lastSyncedAt": "2026-08-20T09:00:00" }

### 전달 시 꼭 확인해야 할 것 (GitHub)
evidence_source는 항상 GitHub 커밋/PR 원본 링크 형태로 통일 — 형태가 다르면 F3 "근거" 클릭 시 깨짐
커밋 메시지는 컨벤셔널 커밋 프리픽스가 없으면 decision으로 채택하지 않음 (노이즈 방지 — "wip", "typo fix" 같은 커밋이 전부 결정 노드가 되는 것을 막기 위함)
코멘트 분류 키워드 규칙은 Jira 연동과 동일한 js/classifier.js를 그대로 재사용할 예정이므로, 새 키워드 추가 시 프론트팀과 공유 필요
더미데이터 시드 시에도 실제 GitHub REST API 응답 필드명을 그대로 써야 함 (예: commit.message를 message로 바꾸지 말 것)
