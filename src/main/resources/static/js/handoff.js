/**
 * handoff.js — F2 이관 (담당자 선택 → 확인)
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

    function confirmHandoffTarget(candidateKey) {
        const owner = owners[pendingHandoffOwnerKey];
        const candidate = handoffCandidates.find((c) => c.key === candidateKey);
        if (!owner || !candidate) return;

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

        document.getElementById("handoffPlaceholder").style.display = "none";
        document.getElementById("handoffFilled").style.display = "flex";

        closeHandoffPicker();
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

    renderHandoffCandidates();
