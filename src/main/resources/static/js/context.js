/**
 * context.js — F3 컨텍스트 카드 렌더링
 * API.getContext(projectCode)로 데이터를 받아 카드를 그린다.
 */

function nodeTypeLabel(type) {
  return { decision: '결정', reason: '왜냐하면', evidence: '근거' }[type] || type;
}

function renderNode(node) {
  const supersededClass = node.superseded ? ' superseded' : '';
  const tagClass = node.type === 'evidence' ? 'node-tag evidence-tag' : 'node-tag';
  const dotClass = node.type === 'evidence' ? 'node-dot evidence-dot' : 'node-dot';

  const aiBadge = node.aiSummarized
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
      <div class="node-text">${node.text}</div>
      ${dateHtml}
      ${evidenceHtml}
    </div>
  `;
}

async function loadContextCard(projectCode) {
  const root = document.getElementById('context-root');
  root.innerHTML = `<div class="loading-state">맥락을 불러오는 중…</div>`;

  try {
    const data = await API.getContext(projectCode);
    renderContextCard(data);
  } catch (e) {
    console.error('컨텍스트 로드 실패:', e);
    root.innerHTML = `<div class="error-state">맥락을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>`;
  }
}

function renderContextCard(data) {
  const root = document.getElementById('context-root');

  const relatedHtml = (data.related || [])
    .map(r => `<div class="related-item">${r.name}<div class="rdate">${r.date} · ${r.note}</div></div>`)
    .join('');

  const nodesHtml = data.chain.map(renderNode).join('');

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
