/**
 * context.js — F3 컨텍스트 카드 렌더링
 * API.getContext(projectCode)로 데이터를 받아 카드를 그린다.
 */

function nodeTypeLabel(type) {
  return { decision: '결정', reason: '왜냐하면', evidence: '근거' }[type] || type;
}

/**
 * 근거(evidence) 노드는 원문(node.originalText)이 있으면 Summarizer로
 * 동적으로 요약 여부를 판단한다 — mock의 aiSummarized 플래그에 의존하지 않고
 * 실제 길이 기준으로 매번 계산한다 (임계값 80자, summarizer.js 참고).
 */
async function resolveEvidenceDisplay(node) {
  if (node.type !== 'evidence' || !node.originalText) {
    return { text: node.text, aiSummarized: false };
  }
  const result = await API.summarizeText(node.originalText);
  return {
    text: result.wasSummarized ? result.summary : node.originalText,
    aiSummarized: result.wasSummarized,
  };
}

function renderNode(node, evidenceDisplay) {
  const supersededClass = node.superseded ? ' superseded' : '';
  const tagClass = node.type === 'evidence' ? 'node-tag evidence-tag' : 'node-tag';
  const dotClass = node.type === 'evidence' ? 'node-dot evidence-dot' : 'node-dot';

  const displayText = evidenceDisplay ? evidenceDisplay.text : node.text;
  const aiSummarized = evidenceDisplay ? evidenceDisplay.aiSummarized : false;

  const aiBadge = aiSummarized
    ? `<span class="ai-badge">AI 요약</span>`
    : '';

  const dateHtml = node.date
    ? `<div class="node-date">${node.date}</div>`
    : '';

  const evidenceHtml = node.source
    ? `<div class="node-evidence" title="${node.originalText || ''}">${node.source} →</div>`
    : '';

  return `
    <div class="node${supersededClass}">
      <div class="${dotClass}"></div>
      <div class="${tagClass}">${nodeTypeLabel(node.type)}</div>
      ${aiBadge}
      <div class="node-text">${displayText}</div>
      ${dateHtml}
      ${evidenceHtml}
    </div>
  `;
}

async function loadContextCard(projectCode) {
  const root = document.getElementById('context-root');
  root.innerHTML = `<div class="loading-state">맥락을 불러오는 중…</div>`;

  try {
    let data = await API.getContext(projectCode);
    data = await tryBuildFromPRs(projectCode, data);
    await renderContextCard(data);
  } catch (e) {
    console.error('컨텍스트 로드 실패:', e);
    root.innerHTML = `<div class="error-state">맥락을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>`;
  }
}

/**
 * 해당 프로젝트에 PR 템플릿 기반 기록(mock/pr_events.json)이 있으면
 * prParser.js로 체인을 조립해 정적 mock의 chain을 대체한다.
 * 없으면 정적 mock 그대로 사용 — PR이 아직 안 쌓인 프로젝트는 기존 방식 유지.
 */
async function tryBuildFromPRs(projectCode, baseData) {
  if (typeof PRParser === 'undefined') return baseData;
  try {
    const [prRes, rawRes] = await Promise.all([
      fetch('/mock/pr_events.json'),
      fetch('/mock/raw_events.json'),
    ]);
    const prMap = await prRes.json();
    const rawEvents = await rawRes.json();
    const prs = prMap[projectCode];
    if (!prs || !prs.length) return baseData; // 이 프로젝트엔 PR 기록 없음 → 정적 mock 유지

    // 여러 PR이 있으면 병합 (최신 것부터), 지금은 프로젝트당 1건 예시
    const merged = prs.flatMap(pr => PRParser.parsePR(pr, rawEvents).chain);
    if (!merged.length) return baseData;

    const hopDepth = Math.max(...merged.map(n => n.depth));
    return { ...baseData, chain: merged, hopDepth };
  } catch (e) {
    console.warn('[PRParser] PR 기반 조립 실패, 정적 mock 유지:', e.message);
    return baseData;
  }
}

async function renderContextCard(data) {
  const root = document.getElementById('context-root');

  const relatedHtml = (data.related || [])
    .map(r => `<div class="related-item">${r.name}<div class="rdate">${r.date} · ${r.note}</div></div>`)
    .join('');

  // 근거 노드는 요약 여부를 먼저 계산한 뒤 렌더링 (필요한 곳에만 AI 개입)
  const nodesHtml = (
    await Promise.all(
      data.chain.map(async (node) => renderNode(node, await resolveEvidenceDisplay(node)))
    )
  ).join('');

  root.innerHTML = `
    <div class="case-strip">
      <div>
        <div class="case-code mono">${data.entity.code}</div>
        <div class="case-title">${data.entity.name}</div>
      </div>
    </div>

    <div class="context-layout">
      <div class="context-card">
        <div class="context-card-head">
          <div class="owner-line">담당 <span class="owner-name">${data.owner.name}</span> · ${data.owner.years}</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <div class="ai-category-badge">${data.aiCategory}</div>
            <div class="hop-badge">${data.hopDepth}-HOP TRACED</div>
          </div>
        </div>
        <div class="chain">
          <div class="thread-line"></div>
          ${nodesHtml}
        </div>
        <div class="context-card-footer">
          <button class="q4-link-btn" id="q4LinkFromContext">이 맥락으로 질문하기 →</button>
        </div>
      </div>
      <div class="context-side">
        <div class="side-mini">
          <div class="side-mini-label">관련 프로젝트</div>
          ${relatedHtml || '<div class="rdate">연결된 프로젝트 없음</div>'}
        </div>
      </div>
    </div>
  `;

  // 노드 순차 페이드인 (검색 중처럼 보이지 않게 빠르게, 0.25초 간격)
  document.querySelectorAll('#context-root .node').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.25}s`;
  });

  document.getElementById('q4LinkFromContext')?.addEventListener('click', () => {
    if (typeof goToQuestionWithContext === 'function') {
      goToQuestionWithContext(data.aiCategory, data.entity.name);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadContextCard('PJ-014'); // 데모 기본 진입 프로젝트
});
