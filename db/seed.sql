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
