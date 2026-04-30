(() => {
    function closeMenu(header, toggleBtn) {
        header.classList.remove("is-menu-open");
        toggleBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("mobile-menu-open");
    }

    function openMenu(header, toggleBtn) {
        header.classList.add("is-menu-open");
        toggleBtn.setAttribute("aria-expanded", "true");
        document.body.classList.add("mobile-menu-open");
    }

    document.addEventListener("DOMContentLoaded", () => {
        const headers = document.querySelectorAll(".site-header[data-mobile-nav]");

        headers.forEach((header) => {
            const toggleBtn = header.querySelector(".site-nav-toggle");
            if (!toggleBtn) return;
            const backdrop = header.querySelector(".site-mobile-backdrop");

            toggleBtn.addEventListener("click", () => {
                const isOpen = header.classList.contains("is-menu-open");
                if (isOpen) {
                    closeMenu(header, toggleBtn);
                } else {
                    openMenu(header, toggleBtn);
                }
            });

            if (backdrop) {
                backdrop.addEventListener("click", () => {
                    closeMenu(header, toggleBtn);
                });
            }

            document.addEventListener("click", (event) => {
                if (!header.contains(event.target)) {
                    closeMenu(header, toggleBtn);
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    closeMenu(header, toggleBtn);
                }
            });
        });
    });
})();
