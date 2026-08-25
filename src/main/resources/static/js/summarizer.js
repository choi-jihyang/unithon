/**
 * summarizer.js — F6 AI 요약 레이어
 *
 * 실제로는 LLM이 담당할 역할이지만, 로컬 환경엔 API 키가 없어
 * 규칙 기반(임계 길이 초과 시 첫 문장 또는 앞부분 축약)으로 먼저 동작하게 만든다.
 * api.js의 summarizeText()가 실제 /api/summarize 호출에 실패하면
 * 이 로직으로 자동 폴백한다 — classifier.js와 동일한 패턴.
 *
 * 핵심 원칙: "필요한 곳에만 개입한다" — 임계 길이(THRESHOLD) 이하 원문은
 * 요약 없이 그대로 통과시킨다. 조건부 개입이라는 것 자체가
 * F6의 차별화 포인트이므로, 이 임계값 분기 로직은 실제 API로 교체되어도 유지해야 한다.
 */
const Summarizer = (() => {
  const THRESHOLD = 80; // 이 길이를 넘는 원문만 요약 대상

  function summarize(text) {
    if (!text || text.length <= THRESHOLD) {
      return { summary: text, wasSummarized: false, originalLength: text ? text.length : 0 };
    }

    // 실제 서비스에서는 이 지점이 LLM 프롬프트("한 문장으로 요약해줘")로 대체된다.
    // 임시 로직: 첫 문장이 원문의 60% 미만으로 충분히 짧을 때만 채택, 아니면 앞부분만 축약.
    const firstSentence = text.split(/[.!?]\s/)[0];
    const sentenceIsShortEnough = firstSentence.length >= 10 && firstSentence.length < text.length * 0.6;
    let summary = sentenceIsShortEnough ? firstSentence : text.slice(0, 40).trim();

    if (!summary.endsWith('.') && !summary.endsWith('음') && !summary.endsWith('됨')) {
      summary = summary.trim() + '…';
    }

    return { summary, wasSummarized: true, originalLength: text.length };
  }

  return { summarize, THRESHOLD };
})();
