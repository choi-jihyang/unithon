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
    '그룹웨어', '인증/로그인', '인증 시스템',
    '자체 세션 방식에서 OAuth2 기반 인증으로 전환',
    '자체 세션 관리 방식에서 토큰 재사용 취약점이 지적되어, 검증된 표준 프로토콜로 이전할 필요가 있다고 판단',
    '외부 보안 감사 결과, 기존 세션 토큰이 만료 처리 없이 재사용 가능한 구조로 확인됨. 심각도 High로 분류되어 즉시 조치 필요...',
    '보안감사 리포트 #INFRA-241',
    'GitHub', '2025-03-05', NOW()
  ),
  (
    (SELECT user_seq FROM users WHERE user_id = 'junghaeun'),
    'ERP', '결제/정산', '결제 모듈',
    '정기결제 재시도 로직을 최대 3회로 제한',
    'PG사 정책상 과도한 재시도는 카드사 차단으로 이어질 수 있어 3회로 제한',
    'PG사 연동 가이드에서 결제 재시도가 3회를 초과할 경우 이상거래로 분류되어 일시 차단될 수 있다고 명시.',
    '결제 정책 문서 #PAY-088',
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
