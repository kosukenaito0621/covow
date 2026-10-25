import { useTheme } from "../../theme/ThemeProvider";
import { Silhouette } from "./Silhouettes";

/**
 * 画面の背景：ゆっくり動くオーロラの光と、テーマごとのシルエット。
 * カードはこの上で透けるガラスになる。動きを減らす設定では止まり、透明度を下げる設定では帯とシルエットを消す。
 */
export function AuroraBackdrop() {
  const { theme } = useTheme();
  return (
    <div className="aurora" aria-hidden="true">
      <span className="b1" />
      <span className="b2" />
      <span className="b3" />
      <span className="b4" />
      <span className="ribbon" />
      <span className="ribbon2" />
      <Silhouette theme={theme.id} />
    </div>
  );
}
