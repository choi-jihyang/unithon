/**
 * intake.js — F1 연동 설정 + 수집 로그 + 미분류 큐
 */

function typeLabel(type) {
  return { decision: '결정', reason: '이유', evidence: '근거', unknown: '미분류', ignore: '잡담 추정' }[type] || type;
}

async function loadUnclassifiedQueue() {
  const root = document.getElementById('unclassified-root');
  root.innerHTML = `<div class="loading-state">불러오는 중…</div>`;

  const res = await fetch('/mock/unclassified.json');
  const items = await res.json();

  // 각 항목에 대해 분류기(또는 실제 API)를 돌려서 확신도 표시
  const classified = await Promise.all(
    items.map(async (item) => {
      const result = await API.classifyText(item.text, item.source);
      return { ...item, suggested: result.type, confidence: result.confidence };
    })
  );

  renderQueue(classified);
}

function renderQueue(items) {
  const root = document.getElementById('unclassified-root');

  if (items.every(i => i.resolved)) {
    root.innerHTML = `<div class="loading-state">미분류 항목이 없습니다</div>`;
    return;
  }

  root.innerHTML = items
    .filter(i => !i.resolved)
    .map(item => `
      <div class="unclassified-row" data-id="${item.id}">
        <span class="source-tag">${item.source}</span>
        <span class="unclassified-text">"${item.text}"</span>
        <span class="unclassified-tag">${item.confidence >= 60 ? `제안: ${typeLabel(item.suggested)} (${item.confidence}%)` : `확신도 ${item.confidence}%`}</span>
        <div class="classify-inline">
          <select class="classify-select" data-id="${item.id}">
            <option value="decision" ${item.suggested === 'decision' ? 'selected' : ''}>결정</option>
            <option value="reason" ${item.suggested === 'reason' ? 'selected' : ''}>이유</option>
            <option value="evidence" ${item.suggested === 'evidence' ? 'selected' : ''}>근거</option>
            <option value="ignore" ${item.suggested === 'ignore' ? 'selected' : ''}>무시</option>
          </select>
          <button class="classify-btn" data-id="${item.id}">분류</button>
        </div>
      </div>
    `).join('');

  root.querySelectorAll('.classify-btn').forEach(btn => {
    btn.addEventListener('click', () => resolveItem(btn.dataset.id));
  });
}

function resolveItem(id) {
  const row = document.querySelector(`.unclassified-row[data-id="${id}"]`);
  const select = row.querySelector('.classify-select');
  const chosen = select.value;

  // 실제로는 여기서 사람이 확정한 분류를 그래프(relations)에 반영하는
  // POST /api/relations 호출이 들어간다. 지금은 로컬 상태만 갱신.
  console.log(`[분류 확정] id=${id} → ${typeLabel(chosen)}`);
  row.style.opacity = '0.3';
  row.style.pointerEvents = 'none';
  setTimeout(() => row.remove(), 300);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('unclassified-root')) {
    loadUnclassifiedQueue();
  }
});
