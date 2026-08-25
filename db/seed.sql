-- 데모 시드 데이터: users 5명 + cards 4개
-- docs/planning/schema.md 기준. src/main/kotlin/com/example/unithon/DataSeeder.kt(삭제됨)와 동일 내용.
-- 로컬 DB에 테이블이 이미 생성된 상태(ddl-auto=update로 bootRun 한 번 띄우면 생성됨)에서 1회 실행.
-- 재실행하면 중복 삽입됨 — 필요하면 아래 TRUNCATE 먼저 실행.

-- TRUNCATE TABLE cards;
-- TRUNCATE TABLE users;

INSERT INTO users (user_id, name, position_seq, position_name, department_seq, department_name, is_use, created_at) VALUES
  ('kimdohyun', '김도현', 1, '사원', 1, '개발1팀', 1, NOW()),
  ('junghaeun', '정하은', 1, '사원', 1, '개발1팀', 1, NOW()),
  ('leeseojun', '이서준', 1, '사원', 1, '개발1팀', 1, NOW()),
  ('parkjimin', '박지민', 5, '팀장', 1, '개발1팀', 1, NOW());

INSERT INTO cards (
  user_seq, solution, category, title,
  decision_content, reason_content, evidence_content, evidence_source,
  source_app, started_at, created_at
) VALUES
  (
    (SELECT user_seq FROM users WHERE user_id = 'kimdohyun'),
    '그룹웨어', '보안', '외부 메일발송 보안이슈 조치',
    '외부로 메일 발송 시 대외비 파일 유출 이슈 발생',
    'DRM 도입하여 외부발송 건은 원본추출 절차를 추가해 관리할 필요가 있다고 판단',
    '...',
    'DRM 도입을 통해 보안절차 강화 사례',
    'GitHub', '2025-03-05', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
    'ERP', '오류', '발주 중복 방지',
    '발주 등록 후 결재상신 시 중복 기안되어 방지로직 추가',
    '재발 방지 필요',
    '...',
    '중복발주 장애 리포트',
    'Jira', '2025-04-10', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'MES', '인프라/배포', '배포 파이프라인',
    'CI 단계를 5단계에서 3단계로 축소',
    '빌드 시간 단축이 목적이며, 테스트 커버리지는 별도 파이프라인으로 분리해 유지',
    '최근 1개월간 CI 파이프라인 실행 시간을 집계한 결과 평균 22분으로, 배포 지연의 주요 원인으로 지목됨.',
    '인프라 리포트 #INFRA-260',
    'GitHub', '2025-02-20', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'MES', '인프라/배포', 'CI 캐시 최적화',
    '의존성 설치 단계에 캐시 계층 추가',
    '동일 의존성을 매번 재설치하며 낭비되는 CI 시간을 줄이기 위함',
    NULL,
    '벤치마크 리포트 #INFRA-268',
    'GitHub', '2025-08-01', NOW()
  ),
  (
      (SELECT user_seq FROM users WHERE user_id = 'parkjimin'),
      'ISO', '보안', '접근 로그 감사 자동화 도입',
      '주요 시스템 접근 로그를 매일 자동 취합해 감사 리포트로 생성',
      'ISO 27001 심사 대비, 수기로 로그를 취합하던 절차에서 누락 사고가 발생함',
      'ISO 심사 지적사항 리포트 #ISO-045',
      'ISO-045',
      'GitHub', '2026-08-25', NOW()
  ),
  (
      (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
      '채용시스템', '개인정보', '지원자 이력서 자동 파기 정책 도입',
      '불합격자 이력서를 보관 6개월 후 자동 파기하도록 채용시스템에 정책 적용',
      '개인정보보호법상 채용 목적 달성 후 이력서를 무기한 보관하면 안 된다는 컴플라이언스 이슈가 지적됨',
      '개인정보보호 컴플라이언스 점검 리포트 #PRIV-021',
      'PRIV-021',
      'Jira', '2026-07-15', NOW()
  ),
  -- 아래 5건은 figma_logs 5건과 1:1로 대응하는 카드(Figma 소스). 논의가 종결된
  -- (resolved_at 있음) 3건은 decision_content까지 채우고, 아직 논의 중인 2건은
  -- decision_content를 비워둠(등록 폼 스펙과 동일하게 "확인 안 된 항목은 비워둠").
  (
      (SELECT user_seq FROM users WHERE user_id = 'kimdohyun'),
      '그룹웨어', '보안', '메일발송 DRM 안내 모달 문구 확정',
      'DRM 안내 모달에 절차 필요성을 설명하는 문구를 추가하기로 확정',
      '사용자들이 왜 이 절차가 필요한지 몰라 문의가 반복되어, 보안팀 피드백을 반영해 안내 문구를 확정함',
      'Figma 댓글에서 보안팀 피드백 반영 논의가 종결됨',
      'Figma 댓글 #88010234501',
      'Figma', '2025-03-08', NOW()
  ),
  (
      (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
      'ERP', '오류', '발주 중복 경고 토스트 색상 논의',
      NULL,
      '완전한 에러가 아니라 경고 수준이라 빨간색 대신 노란색으로 톤을 낮추는 안 논의 중',
      NULL,
      'Figma 댓글 #88010234502',
      'Figma', '2025-04-08', NOW()
  ),
  (
      (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
      'MES', '인프라/배포', '배포 대시보드 실패 스텝 필터 토글 논의',
      NULL,
      '로그 전체를 스크롤해야 해서 불편하다는 피드백으로, 실패한 스텝만 필터링하는 토글 추가를 논의 중',
      NULL,
      'Figma 댓글 #88010234503',
      'Figma', '2025-02-18', NOW()
  ),
  (
      (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
      'MES', '인프라/배포', 'CI 캐시 히트율 그래프 대시보드 상단 배치',
      '캐시 히트율 그래프를 대시보드 상단으로 이동',
      '빌드 시간 단축 효과를 한눈에 보여주기 위함',
      'Figma 댓글에서 디자인 변경 논의가 종결됨',
      'Figma 댓글 #88010234504',
      'Figma', '2025-07-28', NOW()
  ),
  (
      (SELECT user_seq FROM users WHERE user_id = 'parkjimin'),
      '그룹웨어', '인증/로그인', '로그인 화면 OAuth 버튼 순서 변경',
      '로그인 화면 OAuth 버튼 순서를 카카오 우선으로 변경',
      '사용자 데이터 기준 카카오 로그인 비중이 훨씬 높아 우선순위 조정',
      'Figma 댓글에서 순서 변경 논의가 종결됨',
      'Figma 댓글 #88010234505',
      'Figma', '2025-03-01', NOW()
  );

-- Figma 원본 수집 데이터 (댓글). 실제 연동 대신 docs/api/figma-integration-api.md의
-- 응답 형태(id/user.handle/message/created_at/resolved_at)를 그대로 반영한 더미 5건.
-- resolved_at이 NULL이면 아직 논의 중(evidence 승격 대상 아님), 값이 있으면 논의 종결.
INSERT INTO figma_logs (
  user_seq, file_key, file_name, comment_content, author, comment_id,
  resolved_at, occurred_at, created_at
) VALUES
  (
    (SELECT user_seq FROM users WHERE user_id = 'kimdohyun'),
    'grpware-security-modal', '그룹웨어 - 메일발송 보안 모달',
    '메일 발송 시 뜨는 DRM 안내 모달에 "왜 이 절차가 필요한지" 한 줄 설명을 추가했습니다. 보안팀 피드백 반영해서 문구 확정합니다.',
    '김도현', '88010234501',
    '2025-03-10 11:20:00', '2025-03-08 09:40:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
    'erp-purchase-screen', 'ERP - 발주 화면',
    '중복 발주 감지됐을 때 토스트 색상을 빨간색 대신 노란색(경고)으로 바꾸는 게 나을까요? 완전 에러는 아니라서 톤을 낮추고 싶은데 의견 주세요.',
    '정하은', '88010234502',
    NULL, '2025-04-08 14:05:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'mes-deploy-dashboard', 'MES - 배포 대시보드',
    '배포 상태 대시보드에 실패한 스텝만 필터링하는 토글 추가하면 어떨까요? 로그 전체를 스크롤해야 해서 불편하다는 얘기가 있었어요.',
    '이서준', '88010234503',
    NULL, '2025-02-18 16:30:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'mes-ci-cache-dashboard', 'MES - CI 캐시 대시보드',
    '캐시 히트율 그래프를 대시보드 상단으로 옮겼습니다. 빌드 시간 단축 효과를 한눈에 보여줄수 있음',
    '이서준', '88010234504',
    '2025-07-30 10:15:00', '2025-07-28 17:50:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'parkjimin'),
    'grpware-login-screen', '그룹웨어 - 로그인 화면',
    '로그인 화면 OAuth 버튼 순서를 카카오 우선으로 바꾸는 안 확정했습니다. 사용자 데이터 기준 카카오 로그인 비중이 훨씬 높아서 반영했어요.',
    '박지민', '88010234505',
    '2025-03-03 09:00:00', '2025-03-01 13:25:00', NOW()
  );

-- GitHub 원본 수집 데이터(커밋/PR). cards 시드 중 source_app='GitHub'인 기존 카드 4개
-- (보안이슈 조치/배포 파이프라인/CI 캐시 최적화/접근 로그 감사 자동화)를 원문으로 삼는다.
-- title=해당 카드의 decision_content, content=reason_content와 동일한 문구 —
-- 원문 로그 → app_logs → cards 3단이 같은 내용을 가리키도록.
-- url(html_url)은 api-contract.md GitHub 예시에 명시된 실제 응답 필드라 채워 넣는다.
INSERT INTO github_logs (
  user_seq, repo_name, type, title, content, author, external_ref, url, occurred_at, created_at
) VALUES
  (
    (SELECT user_seq FROM users WHERE user_id = 'kimdohyun'),
    'groupware', 'PR',
    '외부로 메일 발송 시 대외비 파일 유출 이슈 발생',
    'DRM 도입하여 외부발송 건은 원본추출 절차를 추가해 관리할 필요가 있다고 판단',
    '김도현', '#142', 'https://github.com/example-corp/groupware/pull/142',
    '2025-03-05 10:00:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'mes-platform', 'PR',
    'CI 단계를 5단계에서 3단계로 축소',
    '빌드 시간 단축이 목적이며, 테스트 커버리지는 별도 파이프라인으로 분리해 유지',
    '이서준', '#158', 'https://github.com/example-corp/mes-platform/pull/158',
    '2025-02-20 15:30:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'mes-platform', 'COMMIT',
    '의존성 설치 단계에 캐시 계층 추가',
    '동일 의존성을 매번 재설치하며 낭비되는 CI 시간을 줄이기 위함',
    '이서준', 'a1b2c3d', 'https://github.com/example-corp/mes-platform/commit/a1b2c3d',
    '2025-08-01 09:15:00', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'parkjimin'),
    'iso-audit', 'PR',
    '주요 시스템 접근 로그를 매일 자동 취합해 감사 리포트로 생성',
    'ISO 27001 심사 대비, 수기로 로그를 취합하던 절차에서 누락 사고가 발생함',
    '박지민', '#171', 'https://github.com/example-corp/iso-audit/pull/171',
    '2026-08-25 08:00:00', NOW()
  );

-- Jira 원본 수집 데이터(티켓). cards 시드 중 새로 추가된 "지원자 이력서 자동 파기
-- 정책 도입"(채용시스템, Jira) 카드를 원문으로 삼는다. summary=카드 title,
-- description=decision_content+reason_content를 이어붙인 문구.
-- project_key는 fields.project.key 필드(문서 5번 섹션, 프로젝트 매칭용) — issue_key
-- 접두어(PRIV)와 동일하게 채용시스템 프로젝트 코드로 넣는다.
INSERT INTO jira_logs (
  user_seq, issue_key, project_key, summary, description, status, priority, assignee, occurred_at, created_at
) VALUES
  (
    (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
    'PRIV-021', 'PRIV', '지원자 이력서 자동 파기 정책 도입',
    '불합격자 이력서를 보관 6개월 후 자동 파기하도록 채용시스템에 정책 적용. 개인정보보호법상 채용 목적 달성 후 이력서를 무기한 보관하면 안 된다는 컴플라이언스 이슈가 지적됨.',
    'Resolved', 'High', '정하은', '2026-07-10 09:30:00', NOW()
  );

-- app_logs — 원문 로그(github_logs/jira_logs/figma_logs)를 카드 컬럼 형태로 그대로
-- 옮긴 중간 단계. source_type+source_seq로 원문을, card_seq로 결과 카드를 가리켜서
-- "원문 → app_logs → cards" 3단이 완전히 같은 내용이 되도록 함(제목/결정/이유/근거
-- 전부 대응하는 카드 값과 동일). status는 전부 CLASSIFIED — 10건 전부 카드가 이미
-- 만들어져 있는 상태이므로(미확정 항목은 카드 쪽 값 자체가 NULL).
INSERT INTO app_logs (
  user_seq, source_type, source_seq, solution, category, title,
  decision_content, reason_content, evidence_content, evidence_source,
  started_at, status, card_seq, created_at
) VALUES
  (
    (SELECT user_seq FROM users WHERE user_id = 'kimdohyun'),
    'GITHUB', (SELECT seq FROM github_logs WHERE external_ref = '#142'),
    '그룹웨어', '보안', '외부 메일발송 보안이슈 조치',
    '외부로 메일 발송 시 대외비 파일 유출 이슈 발생',
    'DRM 도입하여 외부발송 건은 원본추출 절차를 추가해 관리할 필요가 있다고 판단',
    '...', 'DRM 도입을 통해 보안절차 강화 사례',
    '2025-03-05', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '외부 메일발송 보안이슈 조치'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'GITHUB', (SELECT seq FROM github_logs WHERE external_ref = '#158'),
    'MES', '인프라/배포', '배포 파이프라인',
    'CI 단계를 5단계에서 3단계로 축소',
    '빌드 시간 단축이 목적이며, 테스트 커버리지는 별도 파이프라인으로 분리해 유지',
    '최근 1개월간 CI 파이프라인 실행 시간을 집계한 결과 평균 22분으로, 배포 지연의 주요 원인으로 지목됨.',
    '인프라 리포트 #INFRA-260',
    '2025-02-20', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '배포 파이프라인'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'GITHUB', (SELECT seq FROM github_logs WHERE external_ref = 'a1b2c3d'),
    'MES', '인프라/배포', 'CI 캐시 최적화',
    '의존성 설치 단계에 캐시 계층 추가',
    '동일 의존성을 매번 재설치하며 낭비되는 CI 시간을 줄이기 위함',
    NULL, '벤치마크 리포트 #INFRA-268',
    '2025-08-01', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = 'CI 캐시 최적화'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'parkjimin'),
    'GITHUB', (SELECT seq FROM github_logs WHERE external_ref = '#171'),
    'ISO', '보안', '접근 로그 감사 자동화 도입',
    '주요 시스템 접근 로그를 매일 자동 취합해 감사 리포트로 생성',
    'ISO 27001 심사 대비, 수기로 로그를 취합하던 절차에서 누락 사고가 발생함',
    'ISO 심사 지적사항 리포트 #ISO-045', 'ISO-045',
    '2026-08-25', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '접근 로그 감사 자동화 도입'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
    'JIRA', (SELECT seq FROM jira_logs WHERE issue_key = 'PRIV-021'),
    '채용시스템', '개인정보', '지원자 이력서 자동 파기 정책 도입',
    '불합격자 이력서를 보관 6개월 후 자동 파기하도록 채용시스템에 정책 적용',
    '개인정보보호법상 채용 목적 달성 후 이력서를 무기한 보관하면 안 된다는 컴플라이언스 이슈가 지적됨',
    '개인정보보호 컴플라이언스 점검 리포트 #PRIV-021', 'PRIV-021',
    '2026-07-15', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '지원자 이력서 자동 파기 정책 도입'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'kimdohyun'),
    'FIGMA', (SELECT seq FROM figma_logs WHERE comment_id = '88010234501'),
    '그룹웨어', '보안', '메일발송 DRM 안내 모달 문구 확정',
    'DRM 안내 모달에 절차 필요성을 설명하는 문구를 추가하기로 확정',
    '사용자들이 왜 이 절차가 필요한지 몰라 문의가 반복되어, 보안팀 피드백을 반영해 안내 문구를 확정함',
    'Figma 댓글에서 보안팀 피드백 반영 논의가 종결됨', 'Figma 댓글 #88010234501',
    '2025-03-08', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '메일발송 DRM 안내 모달 문구 확정'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
    'FIGMA', (SELECT seq FROM figma_logs WHERE comment_id = '88010234502'),
    'ERP', '오류', '발주 중복 경고 토스트 색상 논의',
    NULL,
    '완전한 에러가 아니라 경고 수준이라 빨간색 대신 노란색으로 톤을 낮추는 안 논의 중',
    NULL, 'Figma 댓글 #88010234502',
    '2025-04-08', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '발주 중복 경고 토스트 색상 논의'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'FIGMA', (SELECT seq FROM figma_logs WHERE comment_id = '88010234503'),
    'MES', '인프라/배포', '배포 대시보드 실패 스텝 필터 토글 논의',
    NULL,
    '로그 전체를 스크롤해야 해서 불편하다는 피드백으로, 실패한 스텝만 필터링하는 토글 추가를 논의 중',
    NULL, 'Figma 댓글 #88010234503',
    '2025-02-18', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '배포 대시보드 실패 스텝 필터 토글 논의'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'leeseojun'),
    'FIGMA', (SELECT seq FROM figma_logs WHERE comment_id = '88010234504'),
    'MES', '인프라/배포', 'CI 캐시 히트율 그래프 대시보드 상단 배치',
    '캐시 히트율 그래프를 대시보드 상단으로 이동',
    '빌드 시간 단축 효과를 한눈에 보여주기 위함',
    'Figma 댓글에서 디자인 변경 논의가 종결됨', 'Figma 댓글 #88010234504',
    '2025-07-28', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = 'CI 캐시 히트율 그래프 대시보드 상단 배치'), NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'parkjimin'),
    'FIGMA', (SELECT seq FROM figma_logs WHERE comment_id = '88010234505'),
    '그룹웨어', '인증/로그인', '로그인 화면 OAuth 버튼 순서 변경',
    '로그인 화면 OAuth 버튼 순서를 카카오 우선으로 변경',
    '사용자 데이터 기준 카카오 로그인 비중이 훨씬 높아 우선순위 조정',
    'Figma 댓글에서 순서 변경 논의가 종결됨', 'Figma 댓글 #88010234505',
    '2025-03-01', 'CLASSIFIED',
    (SELECT seq FROM cards WHERE title = '로그인 화면 OAuth 버튼 순서 변경'), NOW()
  );
