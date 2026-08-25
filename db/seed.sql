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
    '캐시 히트율 그래프를 대시보드 상단으로 옮겼습니다. 빌드 시간 단축 효과를 한눈에 보여주고 싶어서요. 확인 부탁드려요.',
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
