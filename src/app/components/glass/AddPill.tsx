import { motion } from "motion/react";
import { useT } from "../../i18n/I18nProvider";
import { Icon } from "../ui/Icon";

/**
 * 購入予定を追加するボタン。見た目は「＋」だけで、ほかの丸いボタンと同じ 44px。
 * 文字は出さないが、読み上げ用の名前（aria-label）は必ず付ける。
 */
export function AddPill({
  label,
  onClick,
  className,
}: {
  label?: string;
  onClick: () => void;
  className?: string;
}) {
  const { t } = useT();
  const name = label ?? t("plan.add");
  return (
    <motion.button
      type="button"
      aria-label={name}
      title={name}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.15 }}
      className={`add-orb inline-flex size-11 shrink-0 items-center justify-center rounded-full ${className ?? ""}`}
    >
      <Icon name="plus" size={22} strokeWidth={2} />
    </motion.button>
  );
}
