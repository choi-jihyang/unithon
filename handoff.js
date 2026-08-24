/**
 * handoff.js — F2 이관 실행
 */
async function executeHandoff() {
  const btn = document.getElementById('handoffBtn');
  const main = document.getElementById('handoffMain');
  btn.disabled = true;

  const payload = {
    entityId: 10,          // 데모: 인증 시스템(PJ-014)
    previousOwnerId: 1,    // 김도현
    nextOwnerId: 2,        // 정하은
  };

  const result = await API.postHandoff(payload);

  main.classList.add('done');
  document.getElementById('handoffStatus').textContent =
    result.optimistic ? '이관 완료 (로컬 반영, 서버 동기화 대기)' : '이관 완료';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('handoffBtn')?.addEventListener('click', executeHandoff);
});
