/**
 * integrations.js — F1 연동수집 (연동 설정 토글 / 미분류 큐 → 카드 등록)
 * 카드 등록은 POST /api/cards로 저장하고, context.js(F3)의 loadCardList()를 호출해 목록을 갱신한다.
 */
    const unclassifiedMoreBtn = document.getElementById(
        "unclassifiedMoreBtn",
    );
    if (unclassifiedMoreBtn) {
        unclassifiedMoreBtn.addEventListener("click", () => {
            const expanding = unclassifiedMoreBtn.textContent.trim() === "더보기";
            document
                .querySelectorAll("#unclassifiedGrid .unclassified-card.hidden")
                .forEach((card) => {
                    card.classList.toggle("hidden", !expanding);
                });
            unclassifiedMoreBtn.textContent = expanding ? "접기" : "더보기";
        });
    }

    // ===== 연동 설정: DB 연동 =====
    async function loadIntegrations() {
        try {
            const res = await fetch(`/api/integrations?userSeq=${getCurrentUserSeq()}`);
            if (!res.ok) return;
            const items = await res.json();
            items.forEach((item) => {
                const row = document.querySelector(
                    `.integ-row[data-source="${item.sourceType}"]`,
                );
                const toggle = row?.querySelector(".toggle");
                if (toggle) toggle.classList.toggle("on", item.enabled);
            });
        } catch (err) {
            console.error("연동 설정 로딩 실패", err);
        }
    }

    document.querySelectorAll(".integ-row").forEach((row) => {
        const sourceType = row.dataset.source;
        const toggle = row.querySelector(".toggle");
        if (!sourceType || !toggle) return;
        toggle.addEventListener("click", async () => {
            try {
                const res = await fetch("/api/integrations/toggle", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userSeq: getCurrentUserSeq(),
                        sourceType,
                    }),
                });
                if (!res.ok) throw new Error("toggle failed");
                const item = await res.json();
                toggle.classList.toggle("on", item.enabled);
            } catch (err) {
                console.error("연동 토글 실패", err);
            }
        });
    });

    loadIntegrations();

    // ===== 미분류 큐: DB 연동 =====
    const SOURCE_META = {
        GITHUB: { abbr: "GH", label: "GitHub" },
        JIRA: { abbr: "JR", label: "Jira" },
        FIGMA: { abbr: "FG", label: "Figma" },
        SLACK: { abbr: "SL", label: "Slack" },
        SENTRY: { abbr: "SN", label: "Sentry" },
        LINEAR: { abbr: "LN", label: "Linear" },
    };

    function formatQueueDate(iso) {
        return iso ? iso.slice(0, 10).replaceAll("-", ".") : "";
    }

    function buildUnclassifiedCard(item) {
        const meta = SOURCE_META[item.sourceType] || {
            abbr: "?",
            label: item.sourceType,
        };
        const card = document.createElement("div");
        card.className = "unclassified-card";
        card.dataset.appLogSeq = item.appLogSeq;
        card.innerHTML = `
                <div class="uq-fields">
                    <div class="uq-field">
                        <div class="uq-label">앱</div>
                        <div class="unclassified-source">
                            <span class="unclassified-icon">${meta.abbr}</span>
                            <span class="unclassified-source-name">${meta.label}</span>
                        </div>
                    </div>
                    <div class="uq-field">
                        <div class="uq-label">담당자</div>
                        <div class="uq-value">${item.ownerName}</div>
                    </div>
                    <div class="uq-field">
                        <div class="uq-label">일자</div>
                        <div class="uq-value mono">${formatQueueDate(item.occurredAt)}</div>
                    </div>
                    <div class="uq-field uq-field-decision">
                        <div class="uq-label">결정</div>
                        <p class="unclassified-text">"${item.text}"</p>
                    </div>
                </div>
                <div class="uq-actions-row">
                    <div class="classify-inline">
                        <button class="classify-ignore-btn">무시</button>
                        <button class="classify-btn">분류</button>
                    </div>
                </div>`;
        return card;
    }

    async function loadUnclassifiedQueue() {
        const grid = document.getElementById("unclassifiedGrid");
        if (!grid) return;
        try {
            const res = await fetch(
                `/api/app-logs/unclassified?userSeq=${getCurrentUserSeq()}`,
            );
            if (!res.ok) return;
            const items = await res.json();
            grid.innerHTML = "";
            items.forEach((item, idx) => {
                const card = buildUnclassifiedCard(item);
                if (idx >= 4) card.classList.add("hidden");
                grid.appendChild(card);
            });
            wireUnclassifiedCardHandlers();
            if (unclassifiedMoreBtn) {
                unclassifiedMoreBtn.style.display = items.length > 4 ? "" : "none";
                unclassifiedMoreBtn.textContent = "더보기";
            }
        } catch (err) {
            console.error("미분류 큐 로딩 실패", err);
        }
    }

    // ===== 미분류 큐 → 수동 카드 등록 =====
    let pendingUnclassifiedCard = null;

    function openRegisterModal({ text, source, owner, sourceCard }) {
        pendingUnclassifiedCard = sourceCard || null;
        document.getElementById("registerProjectInput").value = "";
        document.getElementById("registerTitleInput").value = "";
        document.getElementById("registerOwnerInput").value = owner || "";
        document.getElementById("registerDecisionInput").value = text || "";
        document.getElementById("registerReasonInput").value = "";
        document.getElementById("registerEvidenceInput").value = "";
        document.getElementById("registerSourceTag").textContent =
            source || "Slack";
        document.getElementById("registerModalOverlay").classList.add("show");
    }

    function closeRegisterModal() {
        document
            .getElementById("registerModalOverlay")
            .classList.remove("show");
        pendingUnclassifiedCard = null;
    }

    function openRegisterModalFromCard(card) {
        const text = card
            .querySelector(".unclassified-text")
            .textContent.trim();
        const source = card
            .querySelector(".unclassified-source-name")
            .textContent.trim();
        const owner = card.querySelectorAll(".uq-value")[0].textContent.trim();
        openRegisterModal({ text, source, owner, sourceCard: card });
    }

    // 카드 전체를 클릭해도 등록 화면이 열립니다. 단, 분류/무시 버튼 위 클릭은
    // 각자의 동작을 우선하도록 제외합니다.
    function wireUnclassifiedCardHandlers() {
        document.querySelectorAll(".unclassified-card").forEach((card) => {
            card.addEventListener("click", (e) => {
                if (e.target.closest(".classify-inline")) return;
                openRegisterModalFromCard(card);
            });
        });

        document.querySelectorAll(".classify-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                openRegisterModalFromCard(btn.closest(".unclassified-card"));
            });
        });

        // 무시: 삭제하지 않고 목록 맨 아래로 보냅니다. 여러 번 누르면 무시된
        // 카드들이 그 순서대로 맨 밑에 쌓입니다.
        document.querySelectorAll(".classify-ignore-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const card = btn.closest(".unclassified-card");
                document.getElementById("unclassifiedGrid").appendChild(card);
            });
        });
    }

    loadUnclassifiedQueue();

    document
        .getElementById("registerModalClose")
        .addEventListener("click", closeRegisterModal);
    document
        .getElementById("registerCancelBtn")
        .addEventListener("click", closeRegisterModal);
    document
        .getElementById("registerModalOverlay")
        .addEventListener("click", (e) => {
            if (e.target.id === "registerModalOverlay") closeRegisterModal();
        });

    document.getElementById("registerSaveBtn").addEventListener("click", async () => {
        const project = document.getElementById("registerProjectInput").value.trim();
        const title = document.getElementById("registerTitleInput").value.trim();
        const decision = document
            .getElementById("registerDecisionInput")
            .value.trim();
        const reason = document
            .getElementById("registerReasonInput")
            .value.trim();
        const evidence = document
            .getElementById("registerEvidenceInput")
            .value.trim();
        const source = document
            .getElementById("registerSourceTag")
            .textContent.trim();

        try {
            const res = await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userSeq: getCurrentUserSeq(),
                    solution: project || null,
                    title: title || null,
                    decisionContent: decision || null,
                    reasonContent: reason || null,
                    evidenceContent: evidence || null,
                    sourceApp: source || null,
                }),
            });
            if (!res.ok) throw new Error("카드 등록 실패");

            if (pendingUnclassifiedCard) pendingUnclassifiedCard.remove();
            closeRegisterModal();
            if (typeof loadCardList === "function") loadCardList();
        } catch (err) {
            console.error("카드 등록 실패", err);
            alert("카드 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    });
