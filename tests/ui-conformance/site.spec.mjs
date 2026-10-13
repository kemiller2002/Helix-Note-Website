import { expect, test } from "@playwright/test";
import {
  CONTRACT_WIDTHS,
  expectActionOutcome,
  expectDestinationClearOfHeader,
  expectLabelIntact,
  expectNoOverflow,
  expectPeerAlignment,
  recordTabSequence,
  scaleDefaultText,
  settleFontsAndFrames,
  wasFocusedDuringSequence
} from "./ui-conformance-helpers.mjs";

// HelixNote conformance to visual-engineering/UI-LAYOUT-INTERACTION@1.0.0.
// Surface: the single published route "/" (index.html, served from the
// repository root by GitHub Pages). The action inventory below is the complete
// list of enabled, visible actions on the page.

const DESKTOP_NAV_MIN_WIDTH = 1024; // styles.css @media (max-width: 63.99em) recomposes nav into the menu
// Content-driven breakpoints: 375 (tagline returns beside the brand), 901
// (two-column hero with the menu) and 1024 (first width with the full nav).
const WIDTHS = [...CONTRACT_WIDTHS, 375, 901, DESKTOP_NAV_MIN_WIDTH];

const DESTINATIONS = Object.freeze({
  "#top": /^Turn messy timelines/,
  "#features": "Platform features",
  "#use-cases": "Who HelixNote is for",
  "#how": "How it works",
  "#privacy": "Privacy & control",
  "#faq": "FAQ",
  "#contact": "Request a demo"
});

const NAV_ITEMS = Object.freeze([
  ["Features", "#features"], ["Use cases", "#use-cases"], ["How it works", "#how"],
  ["Privacy", "#privacy"], ["FAQ", "#faq"], ["Request a demo", "#contact"]
]);
const FOOTER_ITEMS = Object.freeze([["Features", "#features"], ["Privacy", "#privacy"], ["Contact", "#contact"]]);

const isDesktop = width => width >= DESKTOP_NAV_MIN_WIDTH;
const heading = (page, hash) => page.getByRole("heading", { name: DESTINATIONS[hash], exact: typeof DESTINATIONS[hash] === "string" });
const hashPattern = hash => new RegExp(`${hash.replace("#", "\\#")}$`);
const primaryNav = page => page.getByRole("navigation", { name: "Primary" });
const menuToggle = page => page.getByRole("button", { name: "Open menu" });
const hero = page => page.locator("#top");

const open = async (page, width) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  await settleFontsAndFrames(page);
};

const openMenu = async page => {
  await menuToggle(page).click();
  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(primaryNav(page)).toBeVisible();
};

const expectReached = async (page, hash) => {
  await expectDestinationClearOfHeader(page, heading(page, hash), page.getByRole("banner"));
};

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test("ULI-L05/L09: no horizontal page overflow or escaping text", async ({ page }) => {
      await open(page, width);
      await expectNoOverflow(page);
    });

    test("ULI-L05: 200% browser default text size keeps text inside its containers", async ({ page }) => {
      await open(page, width);
      await scaleDefaultText(page, 2);
      await expectNoOverflow(page);
    });

    test("ULI-L06/L08/L09: navigation labels are intact and the menu clears the header", async ({ page }) => {
      await open(page, width);
      await expectLabelIntact(page.getByRole("link", { name: "HelixNote home" }));
      if (!isDesktop(width)) {
        await expect(primaryNav(page)).toBeHidden();
        await expectLabelIntact(menuToggle(page));
        await openMenu(page);
        const [menu, banner] = await Promise.all([primaryNav(page).boundingBox(), page.getByRole("banner").boundingBox()]);
        expect(menu.y, "ULI-L08: open menu overlaps the header").toBeGreaterThanOrEqual(banner.y + banner.height);
      }
      for (const [name] of NAV_ITEMS) await expectLabelIntact(primaryNav(page).getByRole("link", { name, exact: true }));
      await expectNoOverflow(page);
    });

    for (const [name, hash] of NAV_ITEMS) {
      test(`ULI-A01/A02/L05: nav "${name}" reaches ${hash} clear of the header`, async ({ page }) => {
        await open(page, width);
        if (!isDesktop(width)) await openMenu(page);
        await expectActionOutcome(page, { ruleId: "ULI-A02",
          action: { role: "link", name, scope: primaryNav(page) }, outcome: { kind: "url", expected: hashPattern(hash) } });
        await expectReached(page, hash);
        if (!isDesktop(width)) {
          await expect(primaryNav(page)).toBeHidden(); // ULI-L08: the menu closes after navigation
          await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false");
        }
      });
    }

    for (const [name, hash, scope] of [
      ["Request a demo", "#contact", hero], ["See what it does", "#features", hero],
      ...FOOTER_ITEMS.map(([label, target]) => [label, target, page => page.getByRole("contentinfo")])
    ]) {
      test(`ULI-A01/A02: CTA "${name}" reaches ${hash}`, async ({ page }) => {
        await open(page, width);
        const contract = { ruleId: "ULI-A02", action: { role: "link", name, scope: scope(page) }, outcome: { kind: "url", expected: hashPattern(hash) } };
        await scope(page).getByRole("link", { name, exact: true }).scrollIntoViewIfNeeded();
        await expectActionOutcome(page, contract);
        await expectReached(page, hash);
      });
    }

    test("ULI-A01/A02: brand link reaches the top of the page", async ({ page }) => {
      await open(page, width);
      await page.getByRole("heading", { name: "FAQ" }).scrollIntoViewIfNeeded();
      await expectActionOutcome(page, { ruleId: "ULI-A02", action: { role: "link", name: "HelixNote home" }, outcome: { kind: "url", expected: /#top$/ } });
      await expectReached(page, "#top");
    });

    test("ULI-L01/L07/L10: declared alignment groups", async ({ page }) => {
      await open(page, width);
      const heroActions = [
        { role: "link", name: "Request a demo", scope: hero(page) },
        { role: "link", name: "See what it does", scope: hero(page) }
      ];
      // Declared composition: one row sharing a top edge; when the row wraps
      // (flex-wrap at narrow widths), the actions share the start edge.
      const [primary, secondary] = await Promise.all(heroActions.map(({ name, scope }) => scope.getByRole("link", { name }).boundingBox()));
      const wrapped = secondary.y >= primary.y + primary.height;
      await expectPeerAlignment(page, wrapped
        ? { ruleId: "ULI-L10", id: "hero-actions-wrapped", edge: "left", peers: heroActions }
        : { ruleId: "ULI-L10", id: "hero-actions-row", edge: "top", peers: heroActions });
      await expectPeerAlignment(page, { ruleId: "ULI-L07", id: "use-case-tabs", edge: "center",
        peers: ["Health", "Research", "Forensics"].map(name => ({ role: "tab", name })) });
      await expectPeerAlignment(page, { ruleId: "ULI-L10", id: "footer-links", edge: "top",
        peers: FOOTER_ITEMS.map(([name]) => ({ role: "link", name, scope: page.getByRole("contentinfo") })) });
      if (isDesktop(width)) {
        await expectPeerAlignment(page, { ruleId: "ULI-L07", id: "primary-nav-row", edge: "center",
          peers: NAV_ITEMS.map(([name]) => ({ role: "link", name, scope: primaryNav(page) })) });
      }
    });
  });
}

test.describe("whole-page actions", () => {
  test("ULI-A02/A08: skip link moves focus to the main content", async ({ page }) => {
    await open(page, 1280);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("ULI-A01/A02: email and external destinations are valid", async ({ page }) => {
    await open(page, 1280);
    await expect(page.getByRole("link", { name: "info@echelonfoundry.com" })).toHaveAttribute("href", "mailto:info@echelonfoundry.com");
    const company = page.getByRole("link", { name: "Echelon Foundry" });
    await expect(company).toHaveAttribute("href", "https://echelonfoundry.com/helixnote");
    await expect(company).toHaveAttribute("target", "_blank");
    await expect(company).toHaveAttribute("rel", /noopener/);
  });

  test("ULI-A01: every same-origin resource resolves", async ({ page, request }) => {
    await open(page, 1280);
    const local = await page.evaluate(() => [...document.querySelectorAll("link[href], script[src], img[src], a[href]")]
      .map(node => new URL(node.getAttribute("href") ?? node.getAttribute("src"), location.href))
      .filter(url => url.origin === location.origin)
      .map(url => url.pathname));
    for (const path of new Set(local)) {
      const response = await request.get(path);
      expect(response.status(), `GET ${path}`).toBe(200);
    }
    const ids = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute("href").slice(1))
      .filter(id => !document.getElementById(id)));
    expect(ids, "in-page links without a target").toEqual([]);
  });

  test("ULI-A02/A06/A08: use-case tabs switch panels by pointer and keyboard", async ({ page }) => {
    await open(page, 390);
    const tab = name => page.getByRole("tab", { name });
    await expect(tab("Health")).toHaveAttribute("aria-selected", "true");
    await expectActionOutcome(page, { ruleId: "ULI-A02", action: { role: "tab", name: "Research" },
      outcome: { kind: "attribute", target: { role: "tab", name: "Research" }, attribute: "aria-selected", expected: "true" } });
    await expect(page.getByRole("tabpanel", { name: "Research" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Multi-variable research and investigations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Complex medical journeys" })).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await expect(tab("Forensics")).toBeFocused();
    await expect(page.getByRole("heading", { name: "High-stakes documentation" })).toBeVisible();
    await page.keyboard.press("Home");
    await expect(tab("Health")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(tab("Forensics")).toHaveAttribute("aria-selected", "true");
    await expect(tab("Health")).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel", { name: "Forensics" })).toBeFocused();
  });

  test("ULI-A02/A06: every FAQ disclosure reveals its answer", async ({ page }) => {
    await open(page, 390);
    const faq = page.locator("#faq");
    const answers = [
      ["Is HelixNote only for medical cases?", /The core value is structured/],
      ["What does “AMA-style citations” mean here?", /numbered references/],
      ["Can I export something I can hand to a specialist?", /clean, printable briefs/],
      ["How do I get access?", /demo \/ early access/]
    ];
    for (const [question, answer] of answers) {
      // <summary> has no implicit ARIA role in Playwright's map; it is addressed by its visible text.
      await expect(faq.getByText(answer)).toBeHidden();
      await faq.getByText(question, { exact: true }).click();
      await expect(faq.getByText(answer)).toBeVisible();
    }
    await expectActionOutcome(page, { ruleId: "ULI-A02", action: { role: "link", name: "Request a demo", scope: faq },
      outcome: { kind: "url", expected: /#contact$/ } });
    await expectReached(page, "#contact");
  });

  test("ULI-A02/A07: copy button copies the template and says so", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
    await open(page, 390);
    await expectActionOutcome(page, { ruleId: "ULI-A02", action: { role: "button", name: "Copy message template" },
      outcome: { kind: "text", target: { role: "status", name: "Copy status" }, expected: "Message template copied to your clipboard." } });
    const template = (await page.getByRole("textbox").inputValue()).trim();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(template);
  });

  test("ULI-A07/A10: copy failure is reported honestly with a recovery path", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } });
      document.execCommand = () => false;
    });
    await open(page, 390);
    await page.getByRole("button", { name: "Copy message template" }).click();
    await expect(page.getByRole("status")).toHaveText(/not available.*press Ctrl\+C/);
    await expect(page.getByRole("status")).not.toHaveText(/copied to your clipboard/);
    await expect(page.getByRole("textbox")).toBeFocused();
    expect(await page.getByRole("textbox").evaluate(area => area.selectionEnd - area.selectionStart)).toBeGreaterThan(0);
  });

  test("ULI-A08/L08: menu closes with Escape and returns focus to the toggle", async ({ page }) => {
    await open(page, 320);
    await menuToggle(page).focus();
    await page.keyboard.press("Enter");
    await expect(primaryNav(page)).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(primaryNav(page).getByRole("link", { name: "Features" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(primaryNav(page)).toBeHidden();
    await expect(menuToggle(page)).toBeFocused();
    await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false");
  });

  for (const width of [320, 1280]) {
    test(`ULI-A08: every action is keyboard reachable (${width}px)`, async ({ page }) => {
      await open(page, width);
      await recordTabSequence(page, 40);
      const controls = [
        page.getByRole("link", { name: "Skip to content" }),
        page.getByRole("link", { name: "HelixNote home" }),
        hero(page).getByRole("link", { name: "Request a demo" }),
        hero(page).getByRole("link", { name: "See what it does" }),
        page.getByRole("tab", { name: "Health" }),
        page.getByRole("tabpanel", { name: "Health" }),
        page.getByRole("link", { name: "info@echelonfoundry.com" }),
        page.getByRole("link", { name: "Echelon Foundry" }),
        page.getByRole("button", { name: "Copy message template" }),
        page.getByRole("textbox"),
        ...FOOTER_ITEMS.map(([name]) => page.getByRole("contentinfo").getByRole("link", { name })),
        ...["Is HelixNote only for medical cases?", "How do I get access?"].map(text => page.locator("#faq summary", { hasText: text })),
        ...(isDesktop(width)
          ? NAV_ITEMS.map(([name]) => primaryNav(page).getByRole("link", { name, exact: true }))
          : [menuToggle(page)])
      ];
      for (const control of controls) {
        expect(await wasFocusedDuringSequence(control), `not reached by Tab: ${control}`).toBe(true);
      }
    });
  }

  test("ULI-A06/L08: reduced motion: no animation, transition or smooth scrolling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, 1280);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    const animated = await page.evaluate(() => [...document.querySelectorAll("*")].filter(element => {
      const style = getComputedStyle(element);
      return style.animationName !== "none" || style.transitionDuration.split(",").some(value => parseFloat(value) > 0);
    }).map(element => element.className || element.tagName));
    expect(animated).toEqual([]);
  });
});
