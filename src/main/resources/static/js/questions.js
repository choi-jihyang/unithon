/**
 * questions.js — F4 질문 (질문 이력 → 답변 코멘트 팝업)
 */
    // ===== 질문 이력 → 답변 코멘트 팝업 =====
    const qaThreads = {};
    let currentQaKey = null;

    function extractQuestionInfo(item) {
        const clone = item.cloneNode(true);
        const tagEl = clone.querySelector(".node-type-tag");
        const tagText = tagEl ? tagEl.textContent.trim() : "";
        const tagClass = tagEl
            ? tagEl.className.replace("node-type-tag", "").trim()
            : "";
        if (tagEl) tagEl.remove();
        const metaEl = clone.querySelector(".q-meta");
        const metaText = metaEl ? metaEl.textContent.trim() : "";
        if (metaEl) metaEl.remove();
        const mainText = clone.textContent.replace(/\s+/g, " ").trim();
        const dashIdx = mainText.indexOf("—");
        const title = dashIdx >= 0 ? mainText.slice(0, dashIdx).trim() : mainText;
        const question =
            dashIdx >= 0 ? mainText.slice(dashIdx + 1).trim() : "";
        return { title, question, tagText, tagClass, metaText };
    }

    function renderQaThread() {
        const answers = qaThreads[currentQaKey] || [];
        const thread = document.getElementById("qaThread");
        if (answers.length === 0) {
            thread.innerHTML =
                '<div class="qa-empty">아직 답변이 없습니다. 첫 답변을 남겨보세요.</div>';
            return;
        }
        thread.innerHTML = answers
            .map(
                (a) => `<div class="qa-item">
                    <div class="qa-item-text">${a.text}</div>
                    <div class="qa-item-meta">${a.author} · ${a.time}</div>
                </div>`,
            )
            .join("");
        thread.scrollTop = thread.scrollHeight;
    }

    function openQaModal(item) {
        const info = extractQuestionInfo(item);
        currentQaKey = item.dataset.q;
        document.getElementById("qaModalTitle").textContent = info.title;
        document.getElementById("qaModalQuestion").textContent = info.question;
        document.getElementById("qaModalMeta").textContent = info.metaText;
        const tagEl = document.getElementById("qaModalTag");
        tagEl.textContent = info.tagText;
        tagEl.className = `node-type-tag ${info.tagClass}`;
        renderQaThread();
        document.getElementById("qaAnswerInput").value = "";
        document.getElementById("qaModalOverlay").classList.add("show");
    }

    function closeQaModal() {
        document.getElementById("qaModalOverlay").classList.remove("show");
    }

    function submitQaAnswer() {
        const input = document.getElementById("qaAnswerInput");
        const text = input.value.trim();
        if (!text || !currentQaKey) return;
        if (!qaThreads[currentQaKey]) qaThreads[currentQaKey] = [];
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const time = `${todayLabel} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        qaThreads[currentQaKey].push({ author: "나", time, text });
        input.value = "";
        renderQaThread();
    }

    document.querySelectorAll(".q-list-item").forEach((item, i) => {
        item.dataset.q = `q${i}`;
        item.addEventListener("click", () => openQaModal(item));
    });
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

    // ===== 유사 질문 검색 (임베딩 기반, 데모) =====
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
