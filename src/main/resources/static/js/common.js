/**
 * common.js — 전역 UI 동작 (탭 전환, 토글, 카테고리 칩 필터, 화면 간 이동, ESC 닫기)
 */
    document.querySelectorAll(".tab").forEach((t) => {
        t.addEventListener("click", () => {
            document
                .querySelectorAll(".tab")
                .forEach((x) => x.classList.remove("active"));
            document
                .querySelectorAll(".screen")
                .forEach((x) => x.classList.remove("active"));
            t.classList.add("active");
            document.getElementById("s" + t.dataset.s).classList.add("active");
            window.scrollTo(0, 0);
        });
    });
    document.querySelectorAll(".toggle").forEach((tg) => {
        tg.addEventListener("click", () => tg.classList.toggle("on"));
    });
    document.querySelectorAll(".cat-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const group = chip.closest(".section") || document;
            group
                .querySelectorAll(".cat-chip")
                .forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");
        });
    });

    const todayLabel = "2026.08.25";

    // 로그인 대체 — 선택된 userSeq를 localStorage에 저장해둔다. 실제 로그인이
    // 붙기 전까지 "유저 목록 중 한 명을 로그인한 것으로 가정"하는 용도.
    // 콘솔에서 setCurrentUserSeq(3) 하면 코드 수정 없이 다른 계정으로 테스트 가능.
    const DEFAULT_USER_SEQ = 1; // 김도현

    function getCurrentUserSeq() {
        const stored = Number(localStorage.getItem("userSeq"));
        return stored || DEFAULT_USER_SEQ;
    }

    function setCurrentUserSeq(userSeq) {
        localStorage.setItem("userSeq", userSeq);
    }

    // 카드 상세 "이 업무에 대해 질문하기"로 넘어온 질문에 card_seq를 실어 보내기 위한
    // 상태. questions.js의 submitNewQuestion()이 읽고, 등록 완료/배너 닫기 시 초기화된다.
    let linkedCardSeq = null;

    function linkToQuestion(title, category, cardSeq) {
        document
            .querySelectorAll(".tab")
            .forEach((x) => x.classList.remove("active"));
        document
            .querySelectorAll(".screen")
            .forEach((x) => x.classList.remove("active"));
        document.querySelector('[data-s="4"]').classList.add("active");
        document.getElementById("s4").classList.add("active");
        document.getElementById("linkedTitle").textContent = title;
        document.getElementById("linkedCat").textContent = category;
        document.getElementById("linkedBanner").classList.add("show");
        const sel = document.getElementById("projectTypeSelect");
        sel.value = category;
        linkedCardSeq = cardSeq ?? null;
        window.scrollTo(0, 0);
    }

    function clearLinkedQuestion() {
        linkedCardSeq = null;
        document.getElementById("linkedBanner").classList.remove("show");
        document.getElementById("projectTypeSelect").disabled = false;
    }

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        closeCaseModal();
        closeRegisterModal();
        closeHandoffPicker();
        closeQaModal();
    });
