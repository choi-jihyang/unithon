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
