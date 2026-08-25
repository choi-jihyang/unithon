# 백엔드 구현 작업 순서

> 기준 문서: [`schema.md`](schema.md)(테이블 설계), [`api-spec.md`](../api/api-spec.md)(API 계약)
> DB: TiDB Cloud, `application-local.properties`에 연결정보 있음, `ddl-auto=update`라 엔티티 추가하면 테이블 자동 생성.
> 순서대로 진행, 완료 시 체크.

## Task 1. users — ✅ 완료
- [x] `User.kt` / `UserRepository.kt` / `UserService.kt` / `UserController.kt`
- [x] `GET /api/users`

## Task 2. cards — ✅ 완료 (병합 로직 제외, Task 3에서 이어감)
- [x] `Card.kt` — `schema.md`의 `cards` 테이블 컬럼 그대로. `category`/`solution`/`sourceApp`은 Kotlin enum 타입이 아니라 표시 문자열("GitHub", "인증/로그인")을 그대로 저장하는 plain String으로 설계 — enum.name 변환 문제 자체가 없음(api-spec.md 주의사항보다 단순한 해법)
- [x] `CardRepository.kt`
- [x] `CardService.kt` — `findVisibleCards`/`findCardDetail`. 이관 체인 병합은 `TODO(Task 3)`로 표시, 지금은 본인 카드만
- [x] `CardController.kt` — `GET /api/cards?userSeq=`, `GET /api/cards/{cardSeq}?userSeq=`(403 처리 포함)
- [x] `db/seed.sql` — 유저 5명(김도현/정하은/이서준/박지민/관리자) + 데모 카드 4개(PJ-014/021/033/040) 시드 SQL. `DataSeeder.kt`(앱 부팅 시 자동 시드)는 삭제 — 로컬 DB에 SQL 파일로 직접 넣는 방식으로 변경
- [x] TiDB Cloud 실제 연결 확인 (bootRun → 테이블 자동 생성 → curl로 API 응답/403 검증까지 완료)

## Task 3. ownership_transitions — ✅ 완료
- [x] `OwnershipTransition.kt` — `schema.md` 그대로(`oldUserSeq`/`newUserSeq`/`transitionedBy`/`transitionedAt`, `cardSeq` 없음)
- [x] `OwnershipTransitionRepository.kt`
- [x] `OwnershipTransitionService.kt` — `transitionedByUserSeq`의 `position_seq >= 5` 권한 체크(미달 시 403), `resolveVisibleUserSeqs`(BFS 재귀 병합)
- [x] `OwnershipTransitionController.kt` — `POST /api/ownership-transitions`
- [x] `CardService`가 이제 `resolveVisibleUserSeqs`로 병합해서 조회 — 실제로 이관 실행 후 curl로 검증 완료(이서준→정하은 이관 후 정하은이 본인 1건+이서준 2건=3건 조회됨, 권한 없는 계정은 403)

## Task 4. questions / question_answers — ✅ 완료
- [x] `Question.kt`, `QuestionAnswer.kt`
- [x] Repository 2개 (`QuestionRepository.countByCardSeq` 포함)
- [x] `QuestionService.kt` — 답변 등록 시 `questions.is_answer=1` 갱신
- [x] `QuestionController.kt` — `POST /api/questions`, `POST /api/questions/{questionSeq}/answers`
- [x] `CardService` 상세 조회에 `afterViewCount`(=`questions.card_seq` count) 실제 연결, curl로 질문→답변→카운트 반영까지 확인

> 테스트 중 발견: `application.properties`의 `anthropic.api-key=${ANTHROPIC_API_KEY}`에 기본값이 없어서, 이 env var가 없으면 **F6과 무관하게 앱 전체가 부팅 실패**한다. → PR #9에서 빈 값으로 고정해서 해결.

## Task 4-1. 이관 권한 분리 제거 — ✅ 완료 (PR #10)
- [x] `OwnershipTransitionService.transfer()`의 `position_seq>=5` 체크 제거 — 고도화 단계로 미룸

## Task 4-2. `POST /api/cards` — ✅ 완료
- [x] F1 "카드로 등록"의 유일한 저장 경로. `userSeq`만 필수, 나머지 nullable
- [x] curl로 생성→목록 반영 확인 완료
- [ ] 로그인/세션 없음 — `userSeq`는 "유저 목록 중 한 명을 로그인한 것으로 가정"하고 프론트가 고정값/선택 UI로 처리하기로 함 (백엔드 작업 아님)

## Task 5. 프론트 fetch 연결 — 프론트 담당자에게 전달 (내 작업 범위 아님)
- [ ] `js/context.js` — `caseData` 인라인 상수 대신 `GET /api/cards?userSeq=`/`GET /api/cards/{id}?userSeq=` fetch로 채움 (렌더 함수 재사용)
- [ ] `js/handoff.js` — `owners`/`handoffCandidates` 대신 `GET /api/users` fetch, 이관 확정 시 `POST /api/ownership-transitions`(`oldUserSeq`/`newUserSeq`/`transitionedByUserSeq`)
- [ ] `js/questions.js`/`integrations.js` — 질문 등록 `POST /api/questions`, 답변 등록 `POST /api/questions/{id}/answers`
- API 계약은 [`api-spec.md`](../api/api-spec.md) 참고. 백엔드(Task 1~4) 전부 완료·검증됨 — 언제든 붙여도 됨.

## Task 6. F1 실연동 — 다른 담당자 작업 중, 내 범위 아님
- [ ] `app_logs`/`github_logs`/`jira_logs`/`figma_logs` 실연동 — 다른 분이 진행 중
- [ ] `GET /api/questions`(질문 이력 목록 실데이터화) — 필요해지면 별도 논의

## ~~F5 성과 / F6 AI요약~~ — 진행 안 함 (범위 제외)

## Task 7. 마감 전
- [ ] 통합 테스트 (bootRun 후 실제 화면에서 F2/F3/F4 흐름 확인)
- [ ] 데모 리허설
