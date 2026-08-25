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

    function linkToQuestion(title, category) {
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
        sel.disabled = true;
        window.scrollTo(0, 0);
    }

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        closeCaseModal();
        closeRegisterModal();
        closeHandoffPicker();
        closeQaModal();
    });
