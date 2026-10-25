import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Icon, type IconName } from "../ui/Icon";

// 見た目はアイコンだけ。名前（label）は読み上げ用の aria-label とツールチップに使う
const ITEMS: { to: "/" | "/plans" | "/analytics" | "/settings"; label: string; icon: IconName }[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/plans", label: "Plans", icon: "plans" },
  { to: "/analytics", label: "Insights", icon: "chart" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

/** 下部に浮かぶガラスのピル型ナビ。選択中の項目だけ白い円になる */
export function FloatingNav({ currentPath }: { currentPath?: string }) {
  const routerPath = useRouterState({ select: (s) => s.location.pathname });
  const path = currentPath ?? routerPath;
  const isActive = (to: string) => (to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`));

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <ul className="overlay-glass-dark pointer-events-auto flex w-full max-w-[300px] items-center justify-between rounded-full px-2 py-2">
        {ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className="relative flex size-12 items-center justify-center rounded-full"
              >
                {active && (
                  <motion.span
                    layoutId="floating-nav-active"
                    className="absolute inset-0 rounded-full bg-white"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon name={item.icon} size={22} className={`relative ${active ? "text-[#111827]" : "text-white"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
