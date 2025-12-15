(() => {
  const header = document.querySelector(".site-header");
  const elevate = () => {
    const y = window.scrollY || 0;
    if (header) header.dataset.elevate = y > 6 ? "true" : "false";
  };
  elevate();
  window.addEventListener("scroll", elevate, { passive: true });

  // Mobile menu
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  const closeNav = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    nav.dataset.open = "false";
  };
  const openNav = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "true");
    nav.dataset.open = "true";
  };
  toggle?.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    expanded ? closeNav() : openNav();
  });

  // Close menu when clicking a link (mobile)
  nav?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.tagName === "A") closeNav();
  });

  // Close menu on escape
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  // Tabs
  const tabsRoot = document.querySelector("[data-tabs]");
  if (tabsRoot) {
    const tabButtons = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
    const panels = tabButtons.map(btn => document.getElementById(btn.getAttribute("aria-controls")));
    const setActive = (id) => {
      tabButtons.forEach((btn, i) => {
        const active = btn.id === id;
        btn.setAttribute("aria-selected", active ? "true" : "false");
        const panel = panels[i];
        if (panel) panel.hidden = !active;
      });
    };
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.id));
      btn.addEventListener("keydown", (e) => {
        const idx = tabButtons.indexOf(btn);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const dir = e.key === "ArrowRight" ? 1 : -1;
          const next = (idx + dir + tabButtons.length) % tabButtons.length;
          tabButtons[next].focus();
          setActive(tabButtons[next].id);
        }
      });
    });
  }

  // Copy helper
  document.addEventListener("click", async (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    const id = el.getAttribute("data-copy");
    if (!id) return;
    const node = document.getElementById(id);
    if (!(node instanceof HTMLTextAreaElement)) return;
    try {
      await navigator.clipboard.writeText(node.value.trim());
      const old = el.textContent;
      el.textContent = "Copied";
      setTimeout(() => (el.textContent = old || "Copy"), 900);
    } catch {
      // Fallback: select text
      node.focus();
      node.select();
      document.execCommand("copy");
    }
  });

  // Click outside closes mobile menu
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!nav || !toggle) return;
    if (nav.dataset.open !== "true") return;
    if (nav.contains(target) || toggle.contains(target)) return;
    closeNav();
  });
})();
