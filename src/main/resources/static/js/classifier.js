/**
 * classifier.js — 비구조화 텍스트(Slack 등) 규칙 기반 분류기
 *
 * 실제 서비스에서는 LLM이 담당할 역할이지만, 해커톤 로컬 환경엔 API 키가 없어
 * 키워드 휴리스틱으로 먼저 동작하게 만든다. api.js의 classifyText()가
 * 실제 /api/classify 호출에 실패하면 이 로직으로 자동 폴백한다.
 *
 * 백엔드/LLM 연동 시 이 파일은 그대로 두고, api.js의 폴백 코드만
 * 실제 API 응답으로 대체되면 된다 — 프론트는 수정할 필요 없음.
 */
const Classifier = (() => {
  // 노드 타입별 신호 키워드. 실제로는 이 자리가 LLM 프롬프트로 대체된다.
  const SIGNALS = {
    decision: ['하기로', '전환', '채택', '결정', '변경', '도입', '적용하기로'],
    reason: ['왜냐하면', '때문에', '이유', '지적', '판단', '문제가', '필요해서'],
    evidence: ['리포트', '로그', '티켓', '#', '확인됨', '기록됨', '보고서'],
    smalltalk: ['가능하신가요', '괜찮으세요', '언제', '내일', '오늘', '점심', '식사'],
  };

  function classify(text) {
    const scores = { decision: 0, reason: 0, evidence: 0, smalltalk: 0 };

    for (const [type, keywords] of Object.entries(SIGNALS)) {
      for (const kw of keywords) {
        if (text.includes(kw)) scores[type] += 1;
      }
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

    if (total === 0) {
      return { type: 'unknown', confidence: 0 };
    }

    const [type, hits] = best;
    const confidence = Math.min(0.95, 0.35 + hits * 0.2); // 규칙기반이라 확신도 상한을 둠

    return { type: type === 'smalltalk' ? 'ignore' : type, confidence: Math.round(confidence * 100) };
  }

  return { classify };
})();
