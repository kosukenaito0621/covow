import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Icon, type IconName } from "../ui/Icon";

const ITEMS: { to: "/" | "/plans" | "/analytics" | "/settings"; label: string; icon: IconName }[] = [
  { to: "/", label: "ホーム", icon: "home" },
  { to: "/plans", label: "予定", icon: "plans" },
  { to: "/analytics", label: "分析", icon: "chart" },
  { to: "/settings", label: "設定", icon: "settings" },
];

/** 下部に浮かぶガラスのピル型ナビ。選択中の項目だけ白い円になる。文字ラベルは省略しない */
export function FloatingNav({ currentPath }: { currentPath?: string }) {
  const routerPath = useRouterState({ select: (s) => s.location.pathname });
  const path = currentPath ?? routerPath;
  const isActive = (to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`));

  return (
    <nav
      aria-label="メイン"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <ul className="overlay-glass-dark pointer-events-auto flex w-full max-w-[400px] items-stretch justify-between rounded-full px-2 py-1.5">
        {ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full"
              >
                <span className="relative inline-flex size-9 items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="floating-nav-active"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <Icon name={item.icon} size={20} className={`relative ${active ? "text-ink" : "text-white"}`} />
                </span>
                <span className={`text-[12px] leading-none ${active ? "font-semibold text-white" : "text-white/80"}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
