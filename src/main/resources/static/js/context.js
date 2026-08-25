/**
 * context.js — F3 맥락카드 (카드 하나 = 담당·결정·이유·근거 4개 노드로 구성된 관계 체인)
 *
 * 카드 데이터는 더 이상 하드코딩된 caseData가 아니라 실제 API에서 가져온다:
 *   - 목록: GET /api/cards?userSeq=  (CardListItem[])
 *   - 상세: GET /api/cards/{cardSeq}?userSeq=  (CardDetail — chain은 기존 mock과 동일한
 *     {tag, name, date, tooltip} 형태라 renderChainNode는 그대로 재사용된다)
 */
    // cardSeq -> CardListItem. 목록 응답을 캐시해 상세 모달에서 착수일 등
    // 상세 응답에 없는 필드를 보완하는 데 쓴다.
    let cardsBySeq = {};

    // cardSeq -> { originalText, summary } — F6 요약 캐시. 상세를 열 때마다
    // chain에서 originalText를 다시 구성하고, summary는 최초 1회만 요청한다.
    const cardSummaryCache = {};

    function formatDateDot(value) {
        if (!value) return "";
        return String(value).slice(0, 10).replace(/-/g, ".");
    }

    function renderChainNode(n) {
        const hasName = !!(n.name && n.name.trim());
        const isEvidence = n.tag === "근거" && hasName;
        const dotClass = isEvidence ? "node-dot evidence-dot" : "node-dot";
        const tagClass = isEvidence ? "node-tag evidence-tag" : "node-tag";
        const textClass = isEvidence
            ? "node-text node-text-link"
            : "node-text";
        const tooltip =
            isEvidence && n.tooltip
                ? `<div class="tooltip">${n.tooltip}</div>`
                : "";
        const nameContent = !hasName
            ? '<span class="node-empty">아직 입력되지 않음</span>'
            : isEvidence
              ? `${n.name} →${tooltip}`
              : n.name;
        return `<div class="node">
                    <div class="${dotClass}"></div>
                    <div class="${tagClass}">${n.tag}</div>
                    <div class="${textClass}">${nameContent}</div>
                </div>`;
    }

    function ensureSummaryBox() {
        let box = document.getElementById("caseSummaryBox");
        if (!box) {
            box = document.createElement("div");
            box.id = "caseSummaryBox";
            box.className = "case-summary-box";
            // context-card-head 안에 넣으면 솔루션명 owner-line과 같은 flex row를
            // 공유해서 공간을 다퉈 솔루션명이 밀려나 보이는 문제가 있었다. 헤더
            // 바로 다음 줄(별도 row)로 배치한다.
            document
                .querySelector(".context-card-head")
                .insertAdjacentElement("afterend", box);
        }
        return box;
    }

    function renderSummary(text, isLoading) {
        const box = ensureSummaryBox();
        box.innerHTML = isLoading
            ? '<span class="case-summary-loading">요약 불러오는 중…</span>'
            : `<span class="case-summary-text">${text}</span>`;
    }

    async function loadSummary(key, data) {
        if (data.summary) {
            renderSummary(data.summary, false);
            return;
        }
        renderSummary(null, true);
        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: data.originalText }),
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            const json = await res.json();
            data.summary = json.summary;
        } catch (e) {
            console.warn(
                "[F3] /api/summarize 실패, 원문 앞부분으로 폴백:",
                e.message,
            );
            data.summary = data.originalText.slice(0, 80).trim() + "…";
        }
        // 응답 도착 시점에 다른 카드로 이미 넘어갔다면 반영하지 않음
        if (document.getElementById("caseCode").textContent === key) {
            renderSummary(data.summary, false);
        }
    }

    // 카드 이력 목록도 미분류 큐와 동일하게 앱 · 담당자 · 일자 · 결정 4가지만 보여줍니다.
    // 외부 CDN 없이도 항상 표시되도록 아이콘은 이니셜 배지로 표시합니다.
    const appIconMap = {
        GitHub: "GH",
        Jira: "JR",
        Figma: "FG",
        Slack: "SL",
        Sentry: "SN",
        Linear: "LN",
    };

    function createHistoryRow(card) {
        const appName = card.sourceApp || "Slack";
        const iconInitials = appIconMap[appName] || appName.slice(0, 2).toUpperCase();
        const ownerValue = card.userName
            ? card.userName
            : '<span class="node-empty">아직 입력되지 않음</span>';
        const decisionValue = card.decisionContent
            ? card.decisionContent
            : '<span class="node-empty">아직 입력되지 않음</span>';
        const dateValue = formatDateDot(card.createdAt);
        const projectValue = card.solution || card.title || "";

        const row = document.createElement("div");
        row.className = "card-history-item";
        row.dataset.case = String(card.cardSeq);
        row.innerHTML = `
            <div class="uq-fields">
                <div class="uq-field">
                    <div class="uq-label">솔루션명</div>
                    <div class="uq-value">${projectValue}</div>
                </div>
                <div class="uq-field">
                    <div class="uq-label">앱</div>
                    <div class="unclassified-source">
                        <span class="unclassified-icon">${iconInitials}</span>
                        <span class="unclassified-source-name">${appName}</span>
                    </div>
                </div>
                <div class="uq-field">
                    <div class="uq-label">담당자</div>
                    <div class="uq-value">${ownerValue}</div>
                </div>
                <div class="uq-field">
                    <div class="uq-label">일자</div>
                    <div class="uq-value mono">${dateValue}</div>
                </div>
                <div class="uq-field uq-field-decision">
                    <div class="uq-label">결정</div>
                    <div class="uq-value">${decisionValue}</div>
                </div>
            </div>
        `;
        row.addEventListener("click", () => openCaseModal(card.cardSeq));
        return row;
    }

    async function loadCardList() {
        const listEl = document.getElementById("caseHistoryList");
        try {
            const res = await fetch(`/api/cards?userSeq=${getCurrentUserSeq()}`);
            if (!res.ok) throw new Error(`status ${res.status}`);
            const cards = await res.json();
            cardsBySeq = {};
            cards.forEach((c) => {
                cardsBySeq[c.cardSeq] = c;
            });
            listEl.innerHTML = "";
            if (cards.length === 0) {
                listEl.innerHTML =
                    '<div class="api-error-note">아직 등록된 카드가 없습니다.</div>';
                return;
            }
            cards.forEach((card) => listEl.appendChild(createHistoryRow(card)));
        } catch (e) {
            console.warn("[F3] /api/cards 조회 실패:", e.message);
            listEl.innerHTML =
                '<div class="api-error-note">카드 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
        }
    }

    function buildOriginalText(chain) {
        return chain
            .filter((n) => n.tag !== "담당" && n.name)
            .map((n) => `${n.tag}: ${n.name}`)
            .join(" ");
    }

    async function openCaseModal(cardSeq) {
        const key = `CARD-${cardSeq}`;
        const listItem = cardsBySeq[cardSeq];

        document
            .querySelectorAll("#caseHistoryList .card-history-item")
            .forEach((row) => {
                row.classList.toggle("selected", row.dataset.case === String(cardSeq));
            });

        document.getElementById("caseCode").textContent = key;
        document.getElementById("caseTitle").textContent = listItem
            ? listItem.title || ""
            : "";
        document.getElementById("caseTag1").textContent = "";
        document.getElementById("caseTag2").textContent = "";
        document.getElementById("caseProjectName").textContent = listItem
            ? listItem.solution || listItem.title || ""
            : "";
        document.getElementById("caseChain").innerHTML =
            '<div class="thread-line"></div><div class="api-error-note">불러오는 중…</div>';
        document.getElementById("caseAfterView").textContent = "";
        document.getElementById("caseModalOverlay").classList.add("show");

        try {
            const res = await fetch(
                `/api/cards/${cardSeq}?userSeq=${getCurrentUserSeq()}`,
            );
            if (res.status === 403) {
                document.getElementById("caseChain").innerHTML =
                    '<div class="api-error-note">이 카드에 접근 권한이 없습니다 (담당자 이관 전).</div>';
                return;
            }
            if (!res.ok) throw new Error(`status ${res.status}`);
            const detail = await res.json();

            document.getElementById("caseTitle").textContent = detail.title || "";
            document.getElementById("caseTag1").textContent = detail.category || "";
            document.getElementById("caseTag2").textContent = listItem
                ? `착수 ${formatDateDot(listItem.startedAt)}`
                : "";
            document.getElementById("caseProjectName").textContent =
                detail.solution || detail.title || "";
            document.getElementById("caseChain").innerHTML =
                '<div class="thread-line"></div>' +
                detail.chain.map(renderChainNode).join("");
            document.getElementById("caseAfterView").textContent =
                detail.afterViewCount > 0
                    ? `관련 질문 ${detail.afterViewCount}건`
                    : "관련 질문 없음";
            document.getElementById("caseLinkBtn").onclick = () => {
                closeCaseModal();
                linkToQuestion(detail.title, detail.category, cardSeq);
            };

            // F6 AI 요약: 지금 단계에서는 화면에 노출 안 하기로 결정 — 끔.
            // 다시 켤 땐 아래 두 줄만 복원하면 됨 (loadSummary/ensureSummaryBox는 그대로 둠).
            // const wrapper =
            //     cardSummaryCache[cardSeq] || (cardSummaryCache[cardSeq] = {});
            // wrapper.originalText = buildOriginalText(detail.chain);
            // loadSummary(key, wrapper);
            const existingSummaryBox = document.getElementById("caseSummaryBox");
            if (existingSummaryBox) existingSummaryBox.remove();
        } catch (e) {
            console.warn("[F3] /api/cards/{cardSeq} 조회 실패:", e.message);
            document.getElementById("caseChain").innerHTML =
                '<div class="api-error-note">카드 상세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
        }
    }

    function closeCaseModal() {
        document.getElementById("caseModalOverlay").classList.remove("show");
    }

    loadCardList();

    document
        .getElementById("caseModalClose")
        .addEventListener("click", closeCaseModal);
    document
        .getElementById("caseModalOverlay")
        .addEventListener("click", (e) => {
            if (e.target.id === "caseModalOverlay") closeCaseModal();
        });
