/*
 * 表示中の画面で、文字と「その文字の背後で条件が一番悪いピクセル」とのコントラストを測る。
 * グラデーションの一番明るい部分で WCAG AA（本文 4.5:1、大きな文字 3:1）を満たすか確認する（指示書 4.7）。
 *
 * 使い方：Playwright の page を受け取る関数式。Playwright MCP の browser_run_code_unsafe（filename 指定）で実行する。
 * 対象：data-contrast-scope を付けた要素、.hero-glass / .metric-pill / .solid-pill / ナビの中の文字。
 * 固定表示のナビは、ページ全体のスクリーンショットでは位置がずれるので、画面内のスクリーンショットで別に測る。
 */
async (page) => {
  // スクロールバーがあると、ページ全体のスクリーンショット（スクロールバーなし）と横幅がずれるので消しておく
  const noScrollbar = await page.addStyleTag({
    content: "html{scrollbar-width:none} html::-webkit-scrollbar{display:none}",
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);

  // 1) 文字の要素・色・大きさ・位置を集める（色は canvas で sRGB に変換。oklab なども正しく読める）
  const targets = await page.evaluate(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const toRgba = (color) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = color;
      cx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const scopes = document.querySelectorAll("[data-contrast-scope], .hero-glass, .metric-pill, .solid-pill, nav ul");
    const out = [];
    const seen = new Set();
    scopes.forEach((scope) => {
      const fixed = !!scope.closest("nav");
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent.trim();
        const el = node.parentElement;
        if (!text || !el || seen.has(el)) continue;
        if (el.closest(".sr-only, .dot-reflection-clip")) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden") continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        seen.add(el);
        const [cr, cg, cb, ca] = toRgba(el instanceof SVGElement ? cs.fill : cs.color);
        let op = 1;
        for (let p = el; p && p !== document.documentElement; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
        const size = parseFloat(cs.fontSize);
        const weight = Number(cs.fontWeight);
        out.push({
          text: text.slice(0, 24),
          rgb: [cr, cg, cb],
          alpha: ca * op,
          large: size >= 24 || (size >= 18.66 && weight >= 700),
          size,
          fixed,
          rect: { x: r.x + (fixed ? 0 : scrollX), y: r.y + (fixed ? 0 : scrollY), w: r.width, h: r.height },
        });
      }
    });
    return out;
  });

  // 2) 文字を隠して背景だけを撮る
  const hide = await page.addStyleTag({
    content: `*{color:transparent!important;-webkit-text-fill-color:transparent!important;transition:none!important}
      svg text{fill:transparent!important} .dot-reflection-clip{visibility:hidden!important}`,
  });
  await page.waitForTimeout(200);
  const navShot = await page.screenshot({ scale: "css", animations: "disabled" });
  const navHide = await page.addStyleTag({ content: "nav{visibility:hidden!important}" });
  const pageShot = await page.screenshot({ fullPage: true, scale: "css", animations: "disabled" });
  await navHide.evaluate((n) => n.remove());
  await hide.evaluate((n) => n.remove());
  await noScrollbar.evaluate((n) => n.remove());

  // 3) ページ内の canvas で画素を読み、条件が一番悪い色とのコントラストを計算する
  const results = await page.evaluate(
    async ({ shots, targets }) => {
      const load = async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        return { c, ctx };
      };
      const canvases = { page: await load(shots.page), nav: await load(shots.nav) };
      const lin = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const ratio = (a, b) => {
        const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      };
      return targets.map((t) => {
        const { c, ctx } = t.fixed ? canvases.nav : canvases.page;
        const x = Math.max(0, Math.floor(t.rect.x));
        const y = Math.max(0, Math.floor(t.rect.y));
        const w = Math.max(1, Math.min(c.width - x, Math.ceil(t.rect.w)));
        const h = Math.max(1, Math.min(c.height - y, Math.ceil(t.rect.h)));
        const data = ctx.getImageData(x, y, w, h).data;
        let worst = Infinity;
        let worstBg = null;
        for (let i = 0; i < data.length; i += 4) {
          const bg = [data[i], data[i + 1], data[i + 2]];
          const fg = t.rgb.map((v, k) => v * t.alpha + bg[k] * (1 - t.alpha));
          const r = ratio(fg, bg);
          if (r < worst) {
            worst = r;
            worstBg = bg;
          }
        }
        const need = t.large ? 3 : 4.5;
        return { text: t.text, size: t.size, ratio: Math.round(worst * 100) / 100, need, ok: worst >= need, bg: `rgb(${worstBg})` };
      });
    },
    { shots: { page: pageShot.toString("base64"), nav: navShot.toString("base64") }, targets },
  );
  const failures = results.filter((r) => !r.ok);
  return {
    checked: results.length,
    failed: failures.length,
    failures,
    lowestPassing: results.filter((r) => r.ok).sort((a, b) => a.ratio - b.ratio).slice(0, 6),
  };
}
