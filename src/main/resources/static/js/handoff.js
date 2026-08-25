/**
 * handoff.js — F2 이관 (담당자 선택 → 확인 → 확정)
 */
    const owners = {
        kim: {
            initial: "김",
            name: "김도현 백엔드 개발자",
            status: "4년차 · 퇴사예정",
            projectCountText: "3건",
            projectBreakdown: [
                { category: "인증/로그인", count: 1 },
                { category: "결제/정산", count: 1 },
                { category: "인프라/배포", count: 1 },
            ],
        },
    };
    const handoffCandidates = [
        { key: "jung", name: "정하은 개발자", meta: "백엔드 · 2년차", initial: "정" },
        { key: "lee", name: "이서준 개발자", meta: "인프라 · 3년차", initial: "이" },
        { key: "park", name: "박지민 개발자", meta: "프론트엔드 · 2년차", initial: "박" },
    ];

    let pendingHandoffOwnerKey = null;
    let pendingHandoffCandidateKey = null;

    // GET /api/users로 받은 실사용자 목록. owners/handoffCandidates는 데모용
    // 표시 이름(직함 포함)이라, 실제 API 호출에 필요한 userSeq는 이 목록에서
    // 이름이 접두 일치하는 사용자를 찾아 매핑한다(고정 ID를 하드코딩하지 않음).
    let userList = [];

    async function loadUsers() {
        try {
            const res = await fetch("/api/users");
            if (!res.ok) throw new Error(`status ${res.status}`);
            userList = await res.json();
        } catch (e) {
            console.warn("[F2] /api/users 조회 실패:", e.message);
        }
    }
    loadUsers();

    function findUserSeq(displayName) {
        const user = userList.find((u) => displayName.startsWith(u.name));
        return user ? user.userSeq : null;
    }

    function renderHandoffCandidates() {
        document.getElementById("handoffCandidateList").innerHTML =
            handoffCandidates
                .map(
                    (c) => `<div class="owner-row" data-candidate="${c.key}" style="cursor: pointer">
                        <div class="owner-left">
                            <div class="avatar owner-avatar">${c.initial}</div>
                            <div>
                                <b>${c.name}</b>
                                <div class="owner-sub">${c.meta}</div>
                            </div>
                        </div>
                    </div>`,
                )
                .join("");
        document
            .querySelectorAll("#handoffCandidateList .owner-row")
            .forEach((row) => {
                row.addEventListener("click", () =>
                    confirmHandoffTarget(row.dataset.candidate),
                );
            });
    }

    function openHandoffPicker(ownerKey) {
        const owner = owners[ownerKey];
        if (!owner) return;
        pendingHandoffOwnerKey = ownerKey;
        document
            .querySelectorAll("#ownerList .owner-row")
            .forEach((row) => {
                row.classList.toggle("selected", row.dataset.owner === ownerKey);
            });
        document.getElementById("handoffPickerNote").textContent =
            `${owner.name}의 프로젝트를 이관받을 담당자를 선택하세요.`;
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

    function confirmHandoffTarget(candidateKey) {
        const owner = owners[pendingHandoffOwnerKey];
        const candidate = handoffCandidates.find((c) => c.key === candidateKey);
        if (!owner || !candidate) return;
        pendingHandoffCandidateKey = candidateKey;
        renderHandoffFeedback("", null);

        document.getElementById("handoffAvatar").textContent = owner.initial;
        document.getElementById("handoffName").textContent = owner.name;
        document.getElementById("handoffStatus").textContent = owner.status;
        document.getElementById("handoffCases").innerHTML =
            `담당 프로젝트 <b>${owner.projectCountText}</b>이 <b>${candidate.name}</b>에게 이관됩니다.<br />축적된 결정·근거 그래프는 그대로 유지되며, 담당자 정보만 갱신됩니다.`;

        document.getElementById("handoffProjectTotal").textContent =
            `총 ${owner.projectCountText}`;
        document.getElementById("handoffProjectBreakdown").innerHTML = owner.projectBreakdown
            .map(
                (b, i, arr) =>
                    `<div class="owner-row" style="padding: 8px 0${i === arr.length - 1 ? "; border-bottom: none" : ""}">
                        <span style="font-size: 14px">${b.category}</span>
                        <span class="mono project-code">${b.count}건</span>
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
        const owner = owners[pendingHandoffOwnerKey];
        const candidate = handoffCandidates.find(
            (c) => c.key === pendingHandoffCandidateKey,
        );
        if (!owner || !candidate) return;

        const oldUserSeq = findUserSeq(owner.name);
        const newUserSeq = findUserSeq(candidate.name);
        if (!oldUserSeq || !newUserSeq) {
            renderHandoffFeedback(
                "사용자 정보를 아직 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
                "error",
            );
            return;
        }

        const btn = document.getElementById("handoffConfirmBtn");
        btn.disabled = true;
        btn.textContent = "이관 처리 중…";
        renderHandoffFeedback("", null);

        try {
            const res = await fetch("/api/ownership-transitions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldUserSeq,
                    newUserSeq,
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

    document.querySelectorAll("#ownerList .owner-row").forEach((row) => {
        row.addEventListener("click", () => openHandoffPicker(row.dataset.owner));
    });
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

    renderHandoffCandidates();
