/**
 * handoff.js — F2 이관 (담당자 선택 → 확인 → 확정)
 *
 * 이관 대상 목록/이관받을 담당자 후보 모두 GET /api/users 결과를 그대로 렌더링한다.
 * (예전 데모 목업의 owners/handoffCandidates 하드코딩 제거 — 실제 유저 수·이름과
 * 항상 일치하도록.) "담당 프로젝트 N건"과 솔루션별 건수는 GET /api/cards?userSeq=
 * 응답을 집계해서 구한다.
 */
    let userList = [];
    let pendingOwnerSeq = null;
    let pendingCandidateSeq = null;
    let pendingOwnerCards = [];

    async function loadUsers() {
        try {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error(`status ${res.status}`);
            userList = await res.json();
        } catch (e) {
            console.warn("[F2] /api/users 조회 실패:", e.message);
        }
        renderOwnerList();
    }
    loadUsers();

    function findUser(userSeq) {
        return userList.find((u) => u.userSeq === userSeq) || null;
    }

    // 퇴사처리(isUse=false)된 사용자는 이관 대상 목록/후보 어느 쪽에도 노출하지 않는다.
    function activeUsers() {
        return userList.filter((u) => u.isUse);
    }

    function userStatusLine(user) {
        return [user.departmentName, user.positionName].filter(Boolean).join(" · ");
    }

    async function fetchUserCards(userSeq) {
        try {
            const res = await fetch(`/api/cards?userSeq=${userSeq}`);
            if (!res.ok) throw new Error(`status ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn("[F2] /api/cards 조회 실패:", e.message);
            return [];
        }
    }

    async function renderOwnerList() {
        const list = document.getElementById("ownerList");
        if (!list) return;
        const active = activeUsers();
        list.innerHTML = active
            .map(
                (u) => `<div class="owner-row" data-owner="${u.userSeq}">
                    <div class="owner-left">
                        <div class="avatar owner-avatar">${u.name.slice(0, 1)}</div>
                        <div>
                            <b>${u.name}</b>
                            <div class="owner-sub" id="ownerSub-${u.userSeq}">담당 프로젝트 확인 중…</div>
                        </div>
                    </div>
                    <div class="owner-right">
                        <span class="status-chip chip-active">재직중</span>
                    </div>
                </div>`,
            )
            .join("");
        document.querySelectorAll("#ownerList .owner-row").forEach((row) => {
            row.addEventListener("click", () =>
                openHandoffPicker(Number(row.dataset.owner)),
            );
        });

        // 목록에 표시할 담당 프로젝트 건수는 각자 비동기로 채운다(순서 무관).
        active.forEach(async (u) => {
            const cards = await fetchUserCards(u.userSeq);
            const sub = document.getElementById(`ownerSub-${u.userSeq}`);
            if (sub) sub.textContent = `담당 프로젝트 ${cards.length}건`;
        });
    }

    function renderHandoffCandidates(excludeUserSeq) {
        const candidates = activeUsers().filter((u) => u.userSeq !== excludeUserSeq);
        document.getElementById("handoffCandidateList").innerHTML = candidates
            .map(
                (c) => `<div class="owner-row" data-candidate="${c.userSeq}" style="cursor: pointer">
                        <div class="owner-left">
                            <div class="avatar owner-avatar">${c.name.slice(0, 1)}</div>
                            <div>
                                <b>${c.name}</b>
                                <div class="owner-sub">${userStatusLine(c)}</div>
                            </div>
                        </div>
                    </div>`,
            )
            .join("");
        document
            .querySelectorAll("#handoffCandidateList .owner-row")
            .forEach((row) => {
                row.addEventListener("click", () =>
                    confirmHandoffTarget(Number(row.dataset.candidate)),
                );
            });
    }

    function openHandoffPicker(ownerSeq) {
        const owner = findUser(ownerSeq);
        if (!owner) return;
        pendingOwnerSeq = ownerSeq;
        document.querySelectorAll("#ownerList .owner-row").forEach((row) => {
            row.classList.toggle(
                "selected",
                Number(row.dataset.owner) === ownerSeq,
            );
        });
        document.getElementById("handoffPickerNote").textContent =
            `${owner.name}의 프로젝트를 이관받을 담당자를 선택하세요.`;
        renderHandoffCandidates(ownerSeq);
        document.getElementById("handoffPickerOverlay").classList.add("show");
    }

    function closeHandoffPicker() {
        document.getElementById("handoffPickerOverlay").classList.remove("show");
    }

    function renderHandoffFeedback(message, type) {
        const el = document.getElementById("handoffFeedback");
        if (!el) return;
        if (!message) {
            el.innerHTML = "";
            return;
        }
        el.innerHTML = `<div class="handoff-feedback ${type}">${message}</div>`;
    }

    async function confirmHandoffTarget(candidateSeq) {
        const owner = findUser(pendingOwnerSeq);
        const candidate = findUser(candidateSeq);
        if (!owner || !candidate) return;
        pendingCandidateSeq = candidateSeq;
        renderHandoffFeedback("", null);

        pendingOwnerCards = await fetchUserCards(owner.userSeq);
        const total = pendingOwnerCards.length;
        const breakdown = new Map();
        pendingOwnerCards.forEach((card) => {
            const key = card.solution || "미지정";
            breakdown.set(key, (breakdown.get(key) || 0) + 1);
        });

        document.getElementById("handoffAvatar").textContent = owner.name.slice(0, 1);
        document.getElementById("handoffName").textContent = owner.name;
        document.getElementById("handoffStatus").textContent = userStatusLine(owner);
        document.getElementById("handoffCases").innerHTML =
            `담당 프로젝트 <b>${total}건</b>이 <b>${candidate.name}</b>에게 이관됩니다.<br />축적된 결정·근거 그래프는 그대로 유지되며, 담당자 정보만 갱신됩니다.`;

        document.getElementById("handoffProjectTotal").textContent = `총 ${total}건`;
        const entries = Array.from(breakdown.entries());
        document.getElementById("handoffProjectBreakdown").innerHTML = entries
            .map(
                ([solution, count], i) =>
                    `<div class="owner-row" style="padding: 8px 0${i === entries.length - 1 ? "; border-bottom: none" : ""}">
                        <span style="font-size: 14px">${solution}</span>
                        <span class="mono project-code">${count}건</span>
                    </div>`,
            )
            .join("");

        const btn = document.getElementById("handoffConfirmBtn");
        btn.disabled = false;
        btn.textContent = "담당자 이관하기";

        document.getElementById("handoffPlaceholder").style.display = "none";
        document.getElementById("handoffFilled").style.display = "flex";

        closeHandoffPicker();
    }

    async function submitHandoffConfirm() {
        const owner = findUser(pendingOwnerSeq);
        const candidate = findUser(pendingCandidateSeq);
        if (!owner || !candidate) return;

        const btn = document.getElementById("handoffConfirmBtn");
        btn.disabled = true;
        btn.textContent = "이관 처리 중…";
        renderHandoffFeedback("", null);

        try {
            const res = await fetch("/api/ownership-transitions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldUserSeq: owner.userSeq,
                    newUserSeq: candidate.userSeq,
                    transitionedByUserSeq: getCurrentUserSeq(),
                }),
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            await res.json();

            btn.textContent = "이관 완료";
            renderHandoffFeedback(
                `${owner.name}의 담당 프로젝트가 ${candidate.name}에게 이관되었습니다.`,
                "success",
            );
        } catch (e) {
            console.warn("[F2] 이관 확정 실패:", e.message);
            btn.disabled = false;
            btn.textContent = "담당자 이관하기";
            renderHandoffFeedback(
                "이관 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
                "error",
            );
        }
    }

    document
        .getElementById("handoffPickerClose")
        .addEventListener("click", closeHandoffPicker);
    document
        .getElementById("handoffPickerOverlay")
        .addEventListener("click", (e) => {
            if (e.target.id === "handoffPickerOverlay") closeHandoffPicker();
        });
    document
        .getElementById("handoffConfirmBtn")
        .addEventListener("click", submitHandoffConfirm);
