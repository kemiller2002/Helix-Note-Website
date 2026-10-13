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

  // Close menu on escape and return focus to the toggle (ULI-A08)
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || nav?.dataset.open !== "true") return;
    const focusWasInMenu = nav.contains(document.activeElement);
    closeNav();
    if (focusWasInMenu) toggle?.focus();
  });

  // Tabs
  const tabsRoot = document.querySelector("[data-tabs]");
  if (tabsRoot) {
    const tabButtons = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
    const panels = tabButtons.map(btn => document.getElementById(btn.getAttribute("aria-controls")));
    // Roving tabindex per the ARIA tabs pattern: only the selected tab is in
    // the Tab sequence; arrows, Home and End move between tabs.
    const setActive = (id) => {
      tabButtons.forEach((btn, i) => {
        const active = btn.id === id;
        btn.setAttribute("aria-selected", active ? "true" : "false");
        btn.tabIndex = active ? 0 : -1;
        const panel = panels[i];
        if (panel) panel.hidden = !active;
      });
    };
    const keyTargets = { ArrowRight: 1, ArrowLeft: -1 };
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => setActive(btn.id));
      btn.addEventListener("keydown", (e) => {
        const idx = tabButtons.indexOf(btn);
        let next = null;
        if (e.key in keyTargets) next = (idx + keyTargets[e.key] + tabButtons.length) % tabButtons.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = tabButtons.length - 1;
        if (next === null) return;
        e.preventDefault();
        tabButtons[next].focus();
        setActive(tabButtons[next].id);
      });
    });
    const selected = tabButtons.find(btn => btn.getAttribute("aria-selected") === "true") ?? tabButtons[0];
    if (selected) setActive(selected.id);
  }

  // Copy helper. The outcome is reported in a live status region and only
  // claims success when the copy actually succeeded (ULI-A02/A07).
  document.addEventListener("click", async (e) => {
    const el = e.target instanceof Element ? e.target.closest("[data-copy]") : null;
    if (!el) return;
    const node = document.getElementById(el.getAttribute("data-copy"));
    if (!(node instanceof HTMLTextAreaElement)) return;
    const status = document.getElementById(el.getAttribute("data-copy-status"));
    const report = (message) => { if (status) status.textContent = message; };
    report("");
    try {
      await navigator.clipboard.writeText(node.value.trim());
      report("Message template copied to your clipboard.");
    } catch {
      node.focus();
      node.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { copied = false; }
      report(copied
        ? "Message template copied to your clipboard."
        : "Copying is not available here. The template is selected; press Ctrl+C (or Command+C) to copy it.");
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
