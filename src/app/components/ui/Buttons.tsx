import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Tone = "light" | "dark";

type ButtonProps = Omit<ComponentProps<typeof motion.button>, "children"> & {
  children: ReactNode;
  /** 置かれる面。dark＝スモークガラスの上 */
  tone?: Tone;
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
};

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45";

/** 主要な操作。明るい面では濃紺、暗い面では白 */
export function PrimaryButton({ children, tone = "light", icon, loading, fullWidth, disabled, className, ...rest }: ButtonProps) {
  const color = tone === "dark" ? "bg-white text-ink" : "bg-ink text-white";
  return (
    <motion.button
      type="button"
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${color} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      {...rest}
    >
      {icon && !loading && <Icon name={icon} size={20} />}
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
}

/** 補助の操作。細い線のピル */
export function SecondaryButton({ children, tone = "light", icon, loading, fullWidth, disabled, className, ...rest }: ButtonProps) {
  const color =
    tone === "dark" ? "border border-white/35 text-white hover:bg-white/8" : "border border-ink/20 text-ink hover:bg-ink/5";
  return (
    <motion.button
      type="button"
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${color} ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      {...rest}
    >
      {icon && !loading && <Icon name={icon} size={20} />}
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="animate-spin motion-reduce:animate-none">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** 細い線の丸いガラスボタン（←、ⓘ、↗）。アイコンだけなので label が必須 */
export function CircleIconButton({
  icon,
  label,
  tone = "dark",
  className,
  ...rest
}: Omit<ComponentProps<typeof motion.button>, "children"> & { icon: IconName; label: string; tone?: Tone }) {
  const color =
    tone === "dark"
      ? "border border-white/30 bg-white/6 text-white hover:bg-white/12"
      : "border border-ink/18 bg-white/55 text-ink hover:bg-white/80";
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${color} ${className ?? ""}`}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </motion.button>
  );
}
