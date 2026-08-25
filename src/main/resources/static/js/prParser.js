/**
 * prParser.js — PR 본문(결정/이유/근거 템플릿)을 F3 체인으로 변환
 *
 * chainBuilder.js(내용 추측 방식)를 대체한다. 오분류가 왜 생겼는지
 * (Figma 코멘트가 무관한 결정의 '이유'로 잘못 묶임) 원인은 "무슨 내용인지 읽고 추측"했기 때문.
 * PR 템플릿(.github/PULL_REQUEST_TEMPLATE.md)을 쓰면 작성자가 이미
 * 결정/이유/근거를 나눠서 적으므로, 이 파서는 추측이 아니라
 * 마크다운 헤더 위치로 섹션만 잘라내면 된다 — 오분류가 구조적으로 불가능해짐.
 *
 * 근거 섹션에 적힌 "Jira: INFRA-241" 같은 참조는 raw_events.json에서
 * 실제 항목을 찾아 원문(evidence)으로 붙인다.
 */
const PRParser = (() => {
  function extractSection(body, header) {
    const pattern = new RegExp(`## ${header}\\s*\\n(?:<!--.*?-->\\s*\\n)?([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const m = body.match(pattern);
    return m ? m[1].trim() : '';
  }

  function parseReferences(evidenceSection) {
    // "- Jira: INFRA-241" / "- Figma: ..." 형태 라인 파싱
    const refs = [];
    evidenceSection.split('\n').forEach(line => {
      const m = line.match(/-\s*(Jira|Figma)\s*:\s*(.+)/i);
      if (m && m[2].trim()) refs.push({ type: m[1], value: m[2].trim() });
    });
    return refs;
  }

  function findMatchingEvent(ref, rawEvents) {
    return rawEvents.find(evt => {
      if (evt.source !== ref.type) return false;
      const p = evt.payload;
      const key = p.key || p.identifier || '';
      if (key) return ref.value.includes(key) || key.includes(ref.value);
      // key가 없는 소스(Figma 등)는 본문에 정확히 포함될 때만 매칭 —
      // 빈 문자열끼리 매칭되는 오류를 막고, 애매하면 매칭 실패로 남긴다.
      return p.message && ref.value.length > 1 && p.message.includes(ref.value);
    });
  }

  /**
   * @param {Object} pr - { title, body, mergedAt, projectCode }
   * @param {Array} rawEvents - raw_events.json (근거 참조 매칭용)
   */
  function parsePR(pr, rawEvents = []) {
    const decisionText = extractSection(pr.body, '결정');
    const reasonText = extractSection(pr.body, '이유');
    const evidenceSection = extractSection(pr.body, '근거.*?');

    if (!decisionText) return { chain: [], hopDepth: 0 }; // 템플릿 안 지킨 PR은 조립 안 함

    const chain = [
      { type: 'decision', text: decisionText, date: pr.mergedAt?.slice(0, 10), source: pr.title, depth: 1 },
    ];

    if (reasonText) {
      chain.push({ type: 'reason', text: reasonText, date: pr.mergedAt?.slice(0, 10), depth: 2 });
    }

    const refs = parseReferences(evidenceSection);
    refs.forEach(ref => {
      const evt = findMatchingEvent(ref, rawEvents);
      if (evt) {
        const p = evt.payload;
        chain.push({
          type: 'evidence',
          text: p.summary || p.message || `${ref.type} 참조`,
          originalText: p.description_text,
          date: pr.mergedAt?.slice(0, 10),
          source: `${ref.type} ${ref.value}`,
          depth: 3,
        });
      } else {
        // raw_events에 없는 참조는 링크 텍스트만 근거로 표시 (원문 조회 실패해도 체인은 유지)
        chain.push({ type: 'evidence', text: `${ref.type} 참조: ${ref.value}`, date: pr.mergedAt?.slice(0, 10), source: `${ref.type} ${ref.value}`, depth: 3 });
      }
    });

    return { chain, hopDepth: Math.max(...chain.map(n => n.depth)) };
  }

  return { parsePR, extractSection, parseReferences };
})();
