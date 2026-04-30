(() => {
    function closeMenu(toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("mobile-menu-open");
    }

    function openMenu(toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", "true");
        document.body.classList.add("mobile-menu-open");
    }

    document.addEventListener("DOMContentLoaded", () => {
        const toggles = document.querySelectorAll(".site-header[data-mobile-nav] .site-nav-toggle");

        toggles.forEach((toggleBtn) => {
            const layer = document.getElementById(toggleBtn.getAttribute("aria-controls"));
            if (!layer) return;
            const backdrop = layer.querySelector(".site-mobile-backdrop");

            toggleBtn.addEventListener("click", () => {
                const isOpen = document.body.classList.contains("mobile-menu-open");
                if (isOpen) {
                    closeMenu(toggleBtn);
                } else {
                    openMenu(toggleBtn);
                }
            });

            if (backdrop) {
                backdrop.addEventListener("click", () => {
                    closeMenu(toggleBtn);
                });
            }

            document.addEventListener("click", (event) => {
                const header = toggleBtn.closest(".site-header");
                if (!header.contains(event.target) && !layer.contains(event.target)) {
                    closeMenu(toggleBtn);
                }
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    closeMenu(toggleBtn);
                }
            });
        });
    });
})();
