/**
 * questions.js — F4 질문 (질문 이력 → 답변 코멘트 팝업)
 *
 * 질문 목록/답변 스레드는 더 이상 로컬 qaThreads mock이 아니라 QuestionController API에서
 * 가져온다: GET /api/questions(목록), GET /api/questions/{questionSeq}/answers(답변 스레드),
 * POST /api/questions/{questionSeq}/answers(답변 등록).
 */
    // questionSeq -> QuestionListItem. 목록 응답을 캐시해 모달을 열 때 재사용한다.
    let questionsBySeq = {};
    let currentQuestionSeq = null;

    const targetPartTagMap = {
        DECISION: { text: "결정", cls: "decision" },
        REASON: { text: "이유", cls: "reason" },
        EVIDENCE: { text: "근거", cls: "evidence" },
    };

    // "어떤 부분에 대한 질문인가요" select 라벨(한글) -> 서버가 기대하는 targetPart 값.
    const targetPartValueMap = {
        "결정 내용": "DECISION",
        "결정 이유": "REASON",
        "근거 자료": "EVIDENCE",
    };

    function targetPartTag(targetPart) {
        return targetPartTagMap[targetPart] || { text: targetPart || "", cls: "" };
    }

    function formatDateTimeDot(value) {
        if (!value) return "";
        const [datePart, timePart] = String(value).split("T");
        const dateDot = datePart.replace(/-/g, ".");
        const hm = timePart ? timePart.slice(0, 5) : "";
        return hm ? `${dateDot} ${hm}` : dateDot;
    }

    function renderQuestionItem(q) {
        const tag = targetPartTag(q.targetPart);
        const titlePrefix = q.cardTitle ? `${q.cardTitle} — ` : "";
        const solutionMeta = q.solution ? `${q.solution} · ` : "";
        return `<div class="q-list-item" data-question-seq="${q.questionSeq}">
                    ${titlePrefix}"${q.content}"<span class="node-type-tag ${tag.cls}">${tag.text}</span>
                    <div class="q-meta">${solutionMeta}${q.userName} · ${formatDateTimeDot(q.createdAt)}</div>
                </div>`;
    }

    function renderQuestionHistory(questions) {
        const listEl = document.getElementById("questionHistoryList");
        if (questions.length === 0) {
            listEl.innerHTML =
                '<div class="api-error-note">아직 등록된 질문이 없습니다.</div>';
            return;
        }

        const groups = new Map();
        questions.forEach((q) => {
            const cat = q.category || "미분류";
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(q);
        });

        listEl.innerHTML = Array.from(groups.entries())
            .map(
                ([cat, items]) => `
            <div class="cat-group">
                <div class="cat-group-head">
                    <div class="cat-group-title">${cat}</div>
                    <div class="cat-group-count">${items.length}건</div>
                </div>
                <div class="cat-group-items">
                    ${items.map(renderQuestionItem).join("")}
                </div>
            </div>`,
            )
            .join("");

        listEl.querySelectorAll(".q-list-item").forEach((item) => {
            item.addEventListener("click", () =>
                openQaModal(Number(item.dataset.questionSeq)),
            );
        });
    }

    async function loadQuestions() {
        const listEl = document.getElementById("questionHistoryList");
        try {
            const res = await fetch("/api/questions");
            if (!res.ok) throw new Error(`status ${res.status}`);
            const questions = await res.json();
            questionsBySeq = {};
            questions.forEach((q) => {
                questionsBySeq[q.questionSeq] = q;
            });
            renderQuestionHistory(questions);
        } catch (e) {
            console.warn("[F4] /api/questions 조회 실패:", e.message);
            listEl.innerHTML =
                '<div class="api-error-note">질문 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
        }
    }

    function renderAnswerThread(answers) {
        const thread = document.getElementById("qaThread");
        if (answers.length === 0) {
            thread.innerHTML =
                '<div class="qa-empty">아직 답변이 없습니다. 첫 답변을 남겨보세요.</div>';
            return;
        }
        thread.innerHTML = answers
            .map(
                (a) => `<div class="qa-item">
                    <div class="qa-item-text">${a.content}</div>
                    <div class="qa-item-meta">${a.userName} · ${formatDateTimeDot(a.createdAt)}</div>
                </div>`,
            )
            .join("");
        thread.scrollTop = thread.scrollHeight;
    }

    async function loadAnswerThread(questionSeq) {
        const thread = document.getElementById("qaThread");
        thread.innerHTML = '<div class="qa-empty">불러오는 중…</div>';
        try {
            const res = await fetch(`/api/questions/${questionSeq}/answers`);
            if (!res.ok) throw new Error(`status ${res.status}`);
            const answers = await res.json();
            renderAnswerThread(answers);
        } catch (e) {
            console.warn("[F4] 답변 스레드 조회 실패:", e.message);
            thread.innerHTML =
                '<div class="api-error-note">답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>';
        }
    }

    function renderQaFeedback(message) {
        const el = document.getElementById("qaFeedback");
        if (!el) return;
        el.innerHTML = message ? `<div class="api-error-note">${message}</div>` : "";
    }

    function openQaModal(questionSeq) {
        const q = questionsBySeq[questionSeq];
        if (!q) return;
        currentQuestionSeq = questionSeq;

        const tag = targetPartTag(q.targetPart);
        document.getElementById("qaModalTitle").textContent =
            q.cardTitle || q.category || "질문";
        document.getElementById("qaModalQuestion").textContent = q.content;
        document.getElementById("qaModalMeta").textContent =
            `${q.userName} · ${formatDateTimeDot(q.createdAt)}`;
        const tagEl = document.getElementById("qaModalTag");
        tagEl.textContent = tag.text;
        tagEl.className = `node-type-tag ${tag.cls}`;

        renderQaFeedback("");
        document.getElementById("qaAnswerInput").value = "";
        document.getElementById("qaModalOverlay").classList.add("show");
        loadAnswerThread(questionSeq);
    }

    function closeQaModal() {
        document.getElementById("qaModalOverlay").classList.remove("show");
    }

    async function submitQaAnswer() {
        const input = document.getElementById("qaAnswerInput");
        const text = input.value.trim();
        if (!text || !currentQuestionSeq) return;

        const btn = document.getElementById("qaAnswerBtn");
        btn.disabled = true;
        renderQaFeedback("");

        try {
            const res = await fetch(
                `/api/questions/${currentQuestionSeq}/answers`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userSeq: getCurrentUserSeq(),
                        content: text,
                    }),
                },
            );
            if (!res.ok) throw new Error(`status ${res.status}`);
            await res.json();
            input.value = "";
            await loadAnswerThread(currentQuestionSeq);
        } catch (e) {
            console.warn("[F4] 답변 등록 실패:", e.message);
            renderQaFeedback("답변 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            btn.disabled = false;
        }
    }

    function renderQuestionSubmitFeedback(message) {
        const el = document.getElementById("questionSubmitFeedback");
        if (!el) return;
        el.innerHTML = message ? `<div class="api-error-note">${message}</div>` : "";
    }

    async function submitNewQuestion() {
        const input = document.getElementById("questionContentInput");
        const content = input.value.trim();
        if (!content) return;

        const solution = document.getElementById("projectSelect").value;
        const category = document.getElementById("projectTypeSelect").value;
        const targetPartLabel = document.getElementById(
            "questionTargetPartSelect",
        ).value;
        const targetPart = targetPartValueMap[targetPartLabel] || "DECISION";

        const btn = document.getElementById("questionSubmitBtn");
        btn.disabled = true;
        renderQuestionSubmitFeedback("");

        try {
            const res = await fetch("/api/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userSeq: getCurrentUserSeq(),
                    cardSeq: linkedCardSeq,
                    solution,
                    category,
                    targetPart,
                    content,
                }),
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            await res.json();

            input.value = "";
            clearLinkedQuestion();
            await loadQuestions();
        } catch (e) {
            console.warn("[F4] 질문 등록 실패:", e.message);
            renderQuestionSubmitFeedback(
                "질문 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
            );
        } finally {
            btn.disabled = false;
        }
    }

    document
        .getElementById("questionSubmitBtn")
        .addEventListener("click", submitNewQuestion);
    document
        .getElementById("questionContentInput")
        .addEventListener("keydown", (e) => {
            if (e.key === "Enter") submitNewQuestion();
        });

    loadQuestions();

    document
        .getElementById("qaModalClose")
        .addEventListener("click", closeQaModal);
    document.getElementById("qaModalOverlay").addEventListener("click", (e) => {
        if (e.target.id === "qaModalOverlay") closeQaModal();
    });
    document
        .getElementById("qaAnswerBtn")
        .addEventListener("click", submitQaAnswer);
    document.getElementById("qaAnswerInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitQaAnswer();
    });

    // ===== 유사 질문 검색 (임베딩 기반, 데모) — 이번 작업 범위 아님, 그대로 둠 =====
    let embeddingsCache = null;
    let demoQueriesCache = null;

    async function loadEmbeddingData() {
        if (embeddingsCache && demoQueriesCache) {
            return { embeddings: embeddingsCache, demoQueries: demoQueriesCache };
        }
        const [embRes, dqRes] = await Promise.all([
            fetch("/data/embeddings.json"),
            fetch("/data/demo_queries.json"),
        ]);
        embeddingsCache = await embRes.json();
        demoQueriesCache = await dqRes.json();
        return { embeddings: embeddingsCache, demoQueries: demoQueriesCache };
    }

    function cosineSimilarity(a, b) {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // 유사도 내림차순 정렬 후 같은 intent는 최고점 하나만 남기고,
    // 다음 순위 후보로 top-3를 채운다 (같은 의도의 변형 질문이 결과를 도배하는 것 방지).
    function searchSimilar(queryVec, embeddings, topN) {
        const sorted = embeddings
            .map((item) => ({ item, score: cosineSimilarity(queryVec, item.vec) }))
            .sort((a, b) => b.score - a.score);

        const seenIntents = new Set();
        const results = [];
        for (const candidate of sorted) {
            if (seenIntents.has(candidate.item.intent)) continue;
            seenIntents.add(candidate.item.intent);
            results.push(candidate);
            if (results.length >= topN) break;
        }
        return results;
    }

    // 임계값으로 결과를 걸러내지 않고 항상 top-3를 노출하되, 1위 점수에 따라
    // 안내 문구/색상만 3단계로 달리 보여준다.
    function similarityTier(topScore) {
        if (topScore >= 0.7) return "high";
        if (topScore >= 0.45) return "mid";
        return "low";
    }

    function similarityLabel(tier) {
        if (tier === "high") return "비슷한 질문을 찾았습니다";
        if (tier === "mid") return "관련 있을 수 있는 질문입니다";
        return "정확히 일치하는 질문은 없지만, 가까운 기록입니다";
    }

    function renderSimilarResults(queryText, results) {
        const area = document.getElementById("simSearchResult");
        if (!area) return;

        const topScore = results.length > 0 ? results[0].score : 0;
        const tier = similarityTier(topScore);
        const banner = `<div class="sim-result-banner tier-${tier}">"${queryText}" 검색 결과 — ${similarityLabel(tier)}</div>`;

        const items = results
            .map(
                ({ item, score }, i) => `
            <div class="sim-result-item">
                <div class="sim-result-top">
                    <span class="sim-result-rank">${i + 1}위</span>
                    <span class="sim-result-score">유사도 ${Math.round(score * 100)}%</span>
                </div>
                <div class="sim-result-q">Q. ${item.q}</div>
                <div class="sim-result-a">A. ${item.a}</div>
                <div class="sim-result-meta">${item.author} · ${item.dept} · ${item.date}</div>
            </div>`,
            )
            .join("");

        area.innerHTML = banner + `<div class="sim-result-list">${items}</div>`;
    }

    async function runSimilarSearch(queryIndex) {
        const area = document.getElementById("simSearchResult");
        if (area) area.innerHTML = '<div class="sim-empty">검색 중…</div>';
        try {
            const { embeddings, demoQueries } = await loadEmbeddingData();
            const query = demoQueries[queryIndex];
            if (!query) return;
            const results = searchSimilar(query.vec, embeddings, 3);
            renderSimilarResults(query.q, results);
        } catch (e) {
            console.warn("[F4] 유사 질문 검색 실패:", e.message);
            if (area)
                area.innerHTML =
                    '<div class="sim-empty">검색에 실패했습니다.</div>';
        }
    }

    [0, 1, 2].forEach((idx) => {
        const btn = document.getElementById(`simDemoBtn${idx}`);
        if (btn) btn.addEventListener("click", () => runSimilarSearch(idx));
    });
