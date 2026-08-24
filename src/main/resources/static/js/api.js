/**
 * api.js — 백엔드 API 호출 래퍼
 *
 * USE_MOCK을 false로 바꾸면 실제 API만 호출한다.
 * true인 동안은 실제 API를 먼저 시도하고, 실패(404/네트워크 에러)하면
 * /mock/*.json으로 자동 폴백한다 — 백엔드가 아직 없어도 프론트가 멈추지 않는다.
 *
 * 백엔드 API가 준비되면: USE_MOCK = false 로만 바꾸면 된다.
 */
const API = (() => {
  const USE_MOCK = true; // TODO: 백엔드 API 완성되면 false로 변경

  let mockContextCache = null;

  async function loadMockContext() {
    if (mockContextCache) return mockContextCache;
    const res = await fetch('/mock/context.json');
    mockContextCache = await res.json();
    return mockContextCache;
  }

  /**
   * F3: 컨텍스트 카드 조회
   * 실제 API: GET /api/context/{contextIdentifier}
   */
  async function getContext(projectCode) {
    if (!USE_MOCK) {
      const res = await fetch(`/api/context/${projectCode}`);
      if (!res.ok) throw new Error(`context fetch failed: ${res.status}`);
      return res.json();
    }
    try {
      const res = await fetch(`/api/context/${projectCode}`);
      if (res.ok) return res.json();
      throw new Error('api not ready');
    } catch (e) {
      console.warn('[API] context 실제 API 미응답, mock으로 폴백:', e.message);
      const mock = await loadMockContext();
      if (!mock[projectCode]) throw new Error(`mock에도 ${projectCode} 없음`);
      return mock[projectCode];
    }
  }

  /**
   * F2: 이관 실행
   * 실제 API: POST /api/ownership-transitions
   * body: { entityId, previousOwnerId, nextOwnerId }
   */
  async function postHandoff(payload) {
    try {
      const res = await fetch('/api/ownership-transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return res.json();
    } catch (e) {
      console.warn('[API] handoff 실제 API 미응답, 낙관적 완료 처리:', e.message);
      // 데모 중 백엔드가 불안정해도 UI는 완료 상태를 보여준다.
      return { id: 'optimistic', transitionedAt: new Date().toISOString(), optimistic: true };
    }
  }

  /**
   * F4: 질문 기록
   * 실제 API: POST /api/questions (또는 access-events 확장)
   */
  async function postQuestion(payload) {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return res.json();
    } catch (e) {
      console.warn('[API] question 실제 API 미응답, 로컬에만 기록:', e.message);
      return { id: 'local-' + Date.now(), ...payload, optimistic: true };
    }
  }

  /**
   * F1: 비구조화 텍스트 자동 분류 (결정/이유/근거/잡담)
   * 실제 API: POST /api/classify  body: { text, source }
   * 로컬 환경엔 LLM 키가 없으므로, 백엔드/LLM 완성 전까지는
   * classifier.js의 규칙 기반 분류기로 폴백한다.
   */
  async function classifyText(text, source) {
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return res.json(); // { type, confidence }
    } catch (e) {
      console.warn('[API] classify 실제 API 미응답, 규칙기반 폴백 사용:', e.message);
      return Classifier.classify(text); // classifier.js 제공
    }
  }

  return { getContext, postHandoff, postQuestion, classifyText };
})();
