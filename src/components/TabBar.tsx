import type { ComponentType } from "react";
import { useT } from "../i18n";
import type { Dict } from "../i18n";
import {
  IconBox,
  IconChart,
  IconGear,
  IconHome,
  IconPercent,
} from "./Icons";

export type TabId = "home" | "pockets" | "reports" | "tax" | "settings";

const TABS: Array<{
  id: TabId;
  labelKey: keyof Dict;
  Icon: ComponentType<{ size?: number }>;
}> = [
  { id: "home", labelKey: "nav_home", Icon: IconHome },
  { id: "pockets", labelKey: "nav_pockets", Icon: IconBox },
  { id: "reports", labelKey: "nav_reports", Icon: IconChart },
  { id: "tax", labelKey: "nav_tax", Icon: IconPercent },
  { id: "settings", labelKey: "nav_settings", Icon: IconGear },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  const { t } = useT();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ id, labelKey, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="pressable flex flex-1 flex-col items-center gap-0.5 py-2.5"
              style={{ color: isActive ? "var(--accent)" : "var(--faint)" }}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
