/*
 * 表示中の画面で、文字と「その文字の背後で条件が一番悪いピクセル」とのコントラストを測る。
 * グラデーションの一番明るい部分で WCAG AA（本文 4.5:1、大きな文字 3:1）を満たすか確認する（指示書 4.7）。
 *
 * 使い方：Playwright の page を受け取る関数式。Playwright MCP の browser_run_code_unsafe（filename 指定）で実行する。
 * 対象：ガラス・ピル・ナビなど（SCOPES）の中の文字。
 *
 * ページ全体のスクリーンショットは画面の高さが変わり、vh 単位の背景（オーロラ）や固定表示の要素がずれるので使わない。
 * 1画面ずつスクロールして、画面内のスクリーンショットで測る。動く背景は測る間だけ止める（時刻を変えて何度か測ること）。
 *
 * 複数の画面をまとめて測るとき：先に同じオリジンのページで localStorage.__contrastUrls に URL の配列（JSON）を入れておくと、
 * 順に開いて測り、画面ごとの結果を返す（オーロラは 0 秒の位置、USED の満ちる動きは終わった状態で測る）。
 */
async (page) => {
  // 1つの画面を測る
  async function measurePage(page) {
    const SCOPES = "[data-contrast-scope], .lg, .hero-glass, .metric-pill, .solid-pill, nav ul";
    const noScrollbar = await page.addStyleTag({
      content: "html{scrollbar-width:none} html::-webkit-scrollbar{display:none}",
    });
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
  
    const vh = await page.evaluate(() => innerHeight);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const done = new Map();
  
    for (let y = 0; y < total; y += Math.floor(vh * 0.6)) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(250);
  
      // 1) 画面内に全部見えていて、ナビに隠れていない文字を集める（色は canvas で sRGB に変換）
      const targets = await page.evaluate((SCOPES) => {
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
        // 固定表示の要素（ナビ・浮いている追加ボタン）に隠れている文字は測らない
        const overlays = [...document.querySelectorAll("nav ul, [data-fixed-overlay]")].map((e) => e.getBoundingClientRect());
        const out = [];
        const seen = new Set();
        document.querySelectorAll(SCOPES).forEach((scope) => {
          const inNav = !!scope.closest("nav");
          const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();
            const el = node.parentElement;
            if (!text || !el || seen.has(el)) continue;
            if (el.closest(".sr-only, .dot-reflection-clip")) continue;
            if (getComputedStyle(el).visibility === "hidden") continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            const r = range.getBoundingClientRect();
            if (r.width < 2 || r.height < 2 || r.top < 0 || r.bottom > innerHeight) continue;
            if (!inNav && overlays.some((o) => r.bottom > o.top && r.top < o.bottom && r.right > o.left && r.left < o.right)) continue;
            seen.add(el);
            const cs = getComputedStyle(el);
            const [cr, cg, cb, ca] = toRgba(el instanceof SVGElement ? cs.fill : cs.color);
            let op = 1;
            for (let p = el; p && p !== document.documentElement; p = p.parentElement) op *= Number(getComputedStyle(p).opacity);
            const size = parseFloat(cs.fontSize);
            const weight = Number(cs.fontWeight);
            // 同じ要素を2回数えないための目印（ページ上の位置）
            const key = `${text}@${Math.round(r.left)},${Math.round(r.top + scrollY)}`;
            out.push({
              key,
              text: text.slice(0, 24),
              rgb: [cr, cg, cb],
              alpha: ca * op,
              large: size >= 24 || (size >= 18.66 && weight >= 700),
              size,
              rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            });
          }
        });
        return out;
      }, SCOPES);
      const fresh = targets.filter((t) => !done.has(t.key));
      if (fresh.length === 0) continue;
  
      // 2) 文字を隠して背景だけを撮る
      const hide = await page.addStyleTag({
        content: `*{color:transparent!important;-webkit-text-fill-color:transparent!important;transition:none!important}
          svg text{fill:transparent!important} .dot-reflection-clip{visibility:hidden!important}`,
      });
      await page.waitForTimeout(120);
      const shot = (await page.screenshot({ scale: "css" })).toString("base64");
      await hide.evaluate((n) => n.remove());
  
      // 3) 画素を読み、条件が一番悪い色とのコントラストを計算する
      const results = await page.evaluate(
        async ({ shot, targets }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${shot}`;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
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
            return { key: t.key, text: t.text, size: t.size, ratio: Math.round(worst * 100) / 100, need, ok: worst >= need, bg: `rgb(${worstBg})` };
          });
        },
        { shot, targets: fresh },
      );
      for (const r of results) done.set(r.key, r);
    }
  
    await noScrollbar.evaluate((n) => n.remove());
    await page.evaluate(() => window.scrollTo(0, 0));
    const all = [...done.values()].map(({ key: _key, ...r }) => r);
    const failures = all.filter((r) => !r.ok);
    return {
      checked: all.length,
      failed: failures.length,
      failures,
      lowestPassing: all.filter((r) => r.ok).sort((a, b) => a.ratio - b.ratio).slice(0, 6),
    };
  }

  const urls = await page.evaluate(() => {
    try {
      const v = localStorage.getItem("__contrastUrls");
      localStorage.removeItem("__contrastUrls");
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  });
  if (Array.isArray(urls) && urls.length) {
    const out = [];
    for (const url of urls) {
      await page.goto(url);
      await page.waitForTimeout(1800);
      await page.evaluate(() =>
        document.getAnimations().forEach((a) => {
          if (a.animationName === "used-fill-in") a.finish();
          else {
            a.pause();
            a.currentTime = 0;
          }
        }),
      );
      const r = await measurePage(page);
      out.push({ url: new URL(url).pathname + new URL(url).search, checked: r.checked, failed: r.failed, failures: r.failures, lowest: r.lowestPassing.slice(0, 2) });
    }
    return out;
  }
  return measurePage(page);
}
