/**
 * integrations.js — F1 연동수집 (미분류 큐 → 카드 등록)
 * caseData/createHistoryRow는 context.js(F3)에 정의되어 있다.
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

    // ===== 미분류 큐 → 수동 카드 등록 =====
    let manualCaseSeq = 0;
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

    document.getElementById("registerSaveBtn").addEventListener("click", () => {
        const project =
            document.getElementById("registerProjectInput").value.trim() ||
            "솔루션 미지정";
        const title =
            document.getElementById("registerTitleInput").value.trim() ||
            "제목 미입력 카드";
        const owner = document.getElementById("registerOwnerInput").value.trim();
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

        manualCaseSeq += 1;
        const key = `PJ-M${String(manualCaseSeq).padStart(2, "0")}`;

        caseData[key] = {
            title,
            project,
            app: source,
            tags: [source, `등록 ${todayLabel}`],
            category: "미분류",
            afterView: "관련 질문 없음",
            related: [],
            chain: [
                { tag: "담당", name: owner, date: todayLabel },
                { tag: "결정", name: decision, date: todayLabel },
                { tag: "이유", name: reason, date: todayLabel },
                { tag: "근거", name: evidence, date: todayLabel },
            ],
        };

        document.getElementById("caseHistoryList").appendChild(createHistoryRow(key));

        if (pendingUnclassifiedCard) pendingUnclassifiedCard.remove();
        closeRegisterModal();
    });
