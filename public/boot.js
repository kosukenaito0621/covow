/* global document, localStorage */
/*
 * 画面を描く前に、前回のテーマと言語を <html> に付ける（アプリ本体が動き出すまでの色の点滅を防ぐ）。
 * index.html の <head> で、CSS より先に読み込む。テーマの色は src/app/theme/themes.ts と同じにする（テストで確かめる）。
 */
(function () {
  var META = {
    aurora: "#060A18",
    earthy: "#F4EDE0",
    tropical: "#F8F4EA",
    dusk: "#1E1B3A",
    sakura: "#FFF4F6",
    frost: "#F8FBFE",
  };
  var root = document.documentElement;
  try {
    var theme = localStorage.getItem("covow-theme");
    if (theme && Object.prototype.hasOwnProperty.call(META, theme)) {
      root.setAttribute("data-theme", theme);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", META[theme]);
    }
    var locale = localStorage.getItem("covow-locale");
    if (locale === "ja" || locale === "mix") root.setAttribute("lang", "ja");
  } catch {
    // 読めなければ初期のテーマのまま
  }
})();
