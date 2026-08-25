/**
 * question.js — F4 질문 로깅
 * API.postQuestion(payload)로 질문을 남기고, 카테고리별로 그룹핑된 이력을 렌더링한다.
 */

const Q4_BASE_CATEGORIES = ['인증/로그인', '결제/정산', '데이터 파이프라인', '인프라/배포', 'API 연동', '프론트엔드 UI', '성능 최적화'];
const Q4_ADD_NEW = '__add_new__';

let q4Categories = [...Q4_BASE_CATEGORIES];
let q4Questions = [
  { id: 'q1', category: '인증/로그인', nodeType: 'reason', text: 'OAuth2 전환이 세션 취약점 때문인가요, 아니면 정책상 결정인가요?', projectName: '인증 시스템', createdAt: '2026-08-25T09:31:00' },
  { id: 'q2', category: '인증/로그인', nodeType: 'decision', text: '콜백 URL을 화이트리스트 방식으로 바꾼 이유가 뭔가요?', projectName: '인증 시스템', createdAt: '2026-08-25T10:02:00' },
  { id: 'q3', category: '결제/정산', nodeType: 'evidence', text: '재시도 정책이 3회로 정해진 근거가 있나요?', projectName: '결제 모듈', createdAt: '2026-08-25T11:14:00' },
  { id: 'q4', category: '결제/정산', nodeType: 'reason', text: '환불 승인 단계를 없앤 이유가 뭔가요?', projectName: '결제 모듈', createdAt: '2026-08-26T09:02:00' },
  { id: 'q5', category: '인프라/배포', nodeType: 'reason', text: 'CI 단계를 줄인 게 속도 때문인가요, 비용 때문인가요?', projectName: '배포 파이프라인', createdAt: '2026-08-26T14:20:00' },
  { id: 'q6', category: '데이터 파이프라인', nodeType: 'evidence', text: '정산 오류 발견까지 19시간 걸렸다는 수치는 어디서 나온 건가요?', projectName: '정산 배치 파이프라인', createdAt: '2026-08-27T09:10:00' },
];
let q4ActiveFilter = '전체';

function q4NodeTypeLabel(type) {
  return { decision: '결정', reason: '이유', evidence: '근거' }[type] || type;
}

function renderCategoryOptions() {
  const sel = document.getElementById('q4Category');
  const prevValue = sel.value;
  sel.innerHTML = q4Categories.map(c => `<option value="${c}">${c}</option>`).join('')
    + `<option value="${Q4_ADD_NEW}">+ 새 유형 추가</option>`;
  if (prevValue && q4Categories.includes(prevValue)) sel.value = prevValue;
}

function ensureCategory(cat) {
  if (cat && !q4Categories.includes(cat)) {
    q4Categories.push(cat);
    renderCategoryOptions();
  }
}

function renderFilters() {
  const box = document.getElementById('q4Filters');
  const chips = ['전체', ...q4Categories];
  box.innerHTML = chips.map(c =>
    `<div class="q4-chip${c === q4ActiveFilter ? ' active' : ''}" data-cat="${c}">${c}</div>`
  ).join('');
  box.querySelectorAll('.q4-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      q4ActiveFilter = chip.dataset.cat;
      renderFilters();
      renderList();
    });
  });
}

function renderList() {
  const box = document.getElementById('q4List');
  const filtered = q4ActiveFilter === '전체'
    ? q4Questions
    : q4Questions.filter(q => q.category === q4ActiveFilter);

  if (filtered.length === 0) {
    box.innerHTML = `<div class="loading-state">아직 남긴 질문이 없습니다.</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(q => {
    if (!groups[q.category]) groups[q.category] = [];
    groups[q.category].push(q);
  });

  box.innerHTML = Object.keys(groups).map(cat => `
    <div class="q4-group">
      <div class="q4-group-title">${cat} · ${groups[cat].length}건</div>
      ${groups[cat].map(q => `
        <div class="q4-item">
          <div class="q4-item-tag">${q4NodeTypeLabel(q.nodeType)}</div>
          <div class="q4-item-text">${q.text}</div>
          <div class="q4-item-meta">${q.projectName ? q.projectName + ' · ' : ''}${new Date(q.createdAt).toLocaleString('ko-KR')}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

async function submitQuestion() {
  const catSel = document.getElementById('q4Category');
  const nodeTypeSel = document.getElementById('q4NodeType');
  const textEl = document.getElementById('q4Text');
  const statusEl = document.getElementById('q4Status');
  const btn = document.getElementById('q4SubmitBtn');

  const category = catSel.value;
  const nodeType = nodeTypeSel.value;
  const text = textEl.value.trim();

  if (!text) {
    statusEl.textContent = '질문 내용을 입력해주세요.';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = '남기는 중…';

  const payload = {
    category,
    nodeType,
    text,
    projectName: catSel.dataset.projectName || null,
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await API.postQuestion(payload);
    q4Questions.unshift({ ...payload, id: result.id });
    textEl.value = '';
    statusEl.textContent = result.optimistic ? '남겼습니다 (로컬 반영, 서버 동기화 대기)' : '남겼습니다';
    renderFilters();
    renderList();
  } catch (e) {
    console.error('질문 등록 실패:', e);
    statusEl.textContent = '질문을 남기지 못했습니다. 잠시 후 다시 시도해주세요.';
  } finally {
    btn.disabled = false;
  }
}

/**
 * F3 → F4 연동: 컨텍스트 카드의 "이 맥락으로 질문하기" 클릭 시 호출.
 * 프로젝트 유형을 카드의 aiCategory로 자동 채우고 잠근다.
 */
function goToQuestionWithContext(category, projectName) {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  document.querySelector('.tab[data-s="4"]').classList.add('active');
  document.getElementById('s4').classList.add('active');

  ensureCategory(category);
  const sel = document.getElementById('q4Category');
  sel.value = category;
  sel.disabled = true;
  sel.dataset.projectName = projectName;

  const banner = document.getElementById('q4ContextBanner');
  banner.style.display = 'block';
  banner.textContent = `맥락카드 [${projectName}]에서 이어짐`;
}

function resetQuestionContextLink() {
  const sel = document.getElementById('q4Category');
  sel.disabled = false;
  delete sel.dataset.projectName;
  const banner = document.getElementById('q4ContextBanner');
  banner.style.display = 'none';
  banner.textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryOptions();
  renderFilters();
  renderList();

  document.getElementById('q4SubmitBtn').addEventListener('click', submitQuestion);

  document.getElementById('q4Category').addEventListener('change', (e) => {
    if (e.target.value === Q4_ADD_NEW) {
      const name = (prompt('추가할 프로젝트 유형 이름을 입력하세요') || '').trim();
      if (name) {
        ensureCategory(name);
        document.getElementById('q4Category').value = name;
      } else {
        document.getElementById('q4Category').value = q4Categories[0];
      }
    }
  });
});
