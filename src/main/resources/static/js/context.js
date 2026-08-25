/**
 * context.js — F3 맥락카드 (카드 하나 = 담당·결정·이유·근거 4개 노드로 구성된 관계 체인)
 */
    // 카드 하나 = 담당(누가) · 결정(decision.name) · 이유(document.name) ·
    // 근거(ticket.name, 클릭 가능) 4개 노드로 구성된 관계 체인
    const caseData = {
        "PJ-014": {
            title: "인증 시스템",
            originalText:
                "OAuth2 기반 로그인 플로우를 리팩터링하면서 세션 만료 처리를 토큰 갱신 방식으로 변경했다. 기존에는 만료 시 강제 로그아웃이었는데, 리프레시 토큰을 도입해 사용자 경험을 개선했다. 관련 보안 검토에서 리프레시 토큰 저장 위치(localStorage vs httpOnly 쿠키) 논의가 있었고, httpOnly 쿠키로 최종 결정했다.",
            project: "그룹웨어",
            app: "GitHub",
            tags: ["백엔드", "착수 2025.03.05"],
            category: "인증/로그인",
            hop: "3-HOP TRACED",
            afterView: "후속 문의 1건",
            related: [
                { name: "결제 모듈", date: "2025.06.14 · 정기결제 로직 변경" },
                { name: "배포 파이프라인", date: "2025.07.04 · CI 단계 축소" },
            ],
            chain: [
                { tag: "담당", name: "김도현", date: "2025.05.07" },
                {
                    tag: "결정",
                    name: "자체 세션 방식에서 OAuth2 기반 인증으로 전환",
                    date: "2025.05.07",
                },
                {
                    tag: "이유",
                    name: "자체 세션 관리 방식에서 토큰 재사용 취약점이 지적되어, 검증된 표준 프로토콜로 이전할 필요가 있다고 판단",
                    date: "2025.05.07 · 결정과 동일 시점",
                },
                {
                    tag: "근거",
                    name: "보안감사 리포트 #INFRA-241",
                    date: "2025.04.22",
                    tooltip:
                        "외부 보안 감사 결과, 기존 세션 토큰이 만료 처리 없이 재사용 가능한 구조로 확인됨. 심각도 High로 분류되어 즉시 조치 필요...",
                },
            ],
        },
        "PJ-021": {
            title: "결제 모듈",
            originalText:
                "PG사 연동 방식을 변경하면서 결제 실패 시 재시도 로직을 추가했다. 멱등성 키(idempotency key)를 도입해 중복 결제를 방지했고, 웹훅 처리 순서가 보장되지 않는 문제 때문에 별도 큐를 붙였다. 정산 배치와의 타이밍 이슈로 하루 지연 처리로 임시 조정한 이력이 있다.",
            project: "ERP",
            app: "Jira",
            tags: ["백엔드", "착수 2025.04.10"],
            category: "결제/정산",
            hop: "2-HOP TRACED",
            afterView: "후속 문의 2건",
            related: [
                { name: "인증 시스템", date: "2025.05.07 · OAuth2 기반 인증 전환" },
            ],
            chain: [
                { tag: "담당", name: "정하은", date: "2025.06.14" },
                {
                    tag: "결정",
                    name: "정기결제 재시도 로직을 최대 3회로 제한",
                    date: "2025.06.14",
                },
                {
                    tag: "이유",
                    name: "PG사 정책상 과도한 재시도는 카드사 차단으로 이어질 수 있어 3회로 제한",
                    date: "2025.06.14 · 결정과 동일 시점",
                },
                {
                    tag: "근거",
                    name: "결제 정책 문서 #PAY-088",
                    date: "2025.06.10",
                    tooltip:
                        "PG사 연동 가이드에서 결제 재시도가 3회를 초과할 경우 이상거래로 분류되어 일시 차단될 수 있다고 명시.",
                },
            ],
        },
        "PJ-033": {
            title: "배포 파이프라인",
            originalText:
                "블루/그린 배포로 전환하면서 헬스체크 기준을 재정의했다. 기존엔 단순 200 응답만 봤는데, 의존 서비스(DB, 캐시) 연결 상태까지 포함하도록 바꿨다. 롤백 자동화를 넣으면서 배포 실패 시 평균 복구 시간이 크게 줄었다.",
            project: "MES",
            app: "GitHub",
            tags: ["인프라", "착수 2025.02.20"],
            category: "인프라/배포",
            hop: "2-HOP TRACED",
            afterView: "후속 문의 1건",
            related: [
                { name: "CI 캐시 최적화", date: "2025.08.24 · 캐시 계층 추가" },
            ],
            chain: [
                { tag: "담당", name: "이서준", date: "2025.07.04" },
                {
                    tag: "결정",
                    name: "CI 단계를 5단계에서 3단계로 축소",
                    date: "2025.07.04",
                },
                {
                    tag: "이유",
                    name: "빌드 시간 단축이 목적이며, 테스트 커버리지는 별도 파이프라인으로 분리해 유지",
                    date: "2025.07.04 · 결정과 동일 시점",
                },
                {
                    tag: "근거",
                    name: "인프라 리포트 #INFRA-260",
                    date: "2025.06.28",
                    tooltip:
                        "최근 1개월간 CI 파이프라인 실행 시간을 집계한 결과 평균 22분으로, 배포 지연의 주요 원인으로 지목됨.",
                },
            ],
        },
        "PJ-040": {
            title: "CI 캐시 최적화",
            originalText:
                "빌드 캐시 히트율이 낮아서 원인을 추적했더니, 의존성 락파일 해시 계산 방식이 매번 미세하게 달라지고 있었다. 락파일 정렬 순서를 고정하고 캐시 키 전략을 바꿔 히트율을 크게 올렸다. 빌드 시간이 절반 가까이 줄었다.",
            project: "MES",
            app: "GitHub",
            tags: ["인프라", "착수 2025.08.01"],
            category: "인프라/배포",
            hop: "1-HOP TRACED",
            afterView: "후속 문의 없음",
            related: [
                { name: "배포 파이프라인", date: "2025.07.04 · CI 단계 축소" },
            ],
            chain: [
                { tag: "담당", name: "이서준", date: "2025.08.24" },
                {
                    tag: "결정",
                    name: "의존성 설치 단계에 캐시 계층 추가",
                    date: "2025.08.24",
                },
                {
                    tag: "이유",
                    name: "동일 의존성을 매번 재설치하며 낭비되는 CI 시간을 줄이기 위함",
                    date: "2025.08.24 · 결정과 동일 시점",
                },
                {
                    tag: "근거",
                    name: "벤치마크 리포트 #INFRA-268",
                    date: "2025.08.20",
                },
            ],
        },
    };

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
            document.querySelector(".context-card-head").appendChild(box);
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

    function openCaseModal(key) {
        const data = caseData[key];
        if (!data) return;
        document
            .querySelectorAll("#caseHistoryList .card-history-item")
            .forEach((row) => {
                row.classList.toggle("selected", row.dataset.case === key);
            });
        document.getElementById("caseCode").textContent = key;
        document.getElementById("caseTitle").textContent = data.title;
        document.getElementById("caseTag1").textContent = data.tags[0];
        document.getElementById("caseTag2").textContent = data.tags[1];
        document.getElementById("caseProjectName").textContent =
            data.project || data.title;
        document.getElementById("caseChain").innerHTML =
            '<div class="thread-line"></div>' +
            data.chain.map(renderChainNode).join("");
        document.getElementById("caseAfterView").textContent = data.afterView;
        loadSummary(key, data);
        document.getElementById("caseLinkBtn").onclick = () => {
            closeCaseModal();
            linkToQuestion(data.title, data.category);
        };
        document.getElementById("caseModalOverlay").classList.add("show");
    }

    function closeCaseModal() {
        document.getElementById("caseModalOverlay").classList.remove("show");
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

    function findChainNode(chain, tag) {
        return chain.find((n) => n.tag === tag) || null;
    }

    function createHistoryRow(key) {
        const data = caseData[key];
        const owner = findChainNode(data.chain, "담당");
        const decision = findChainNode(data.chain, "결정");
        const appName = data.app || "Slack";
        const iconInitials = appIconMap[appName] || appName.slice(0, 2).toUpperCase();
        const ownerValue =
            owner && owner.name
                ? owner.name
                : '<span class="node-empty">아직 입력되지 않음</span>';
        const decisionValue =
            decision && decision.name
                ? decision.name
                : '<span class="node-empty">아직 입력되지 않음</span>';
        const dateValue = (decision && decision.date) || "";
        const projectValue = data.project || data.title;

        const row = document.createElement("div");
        row.className = "card-history-item";
        row.dataset.case = key;
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
        row.addEventListener("click", () => openCaseModal(key));
        return row;
    }

    Object.keys(caseData).forEach((key) => {
        document.getElementById("caseHistoryList").appendChild(createHistoryRow(key));
    });

    document
        .getElementById("caseModalClose")
        .addEventListener("click", closeCaseModal);
    document
        .getElementById("caseModalOverlay")
        .addEventListener("click", (e) => {
            if (e.target.id === "caseModalOverlay") closeCaseModal();
        });
