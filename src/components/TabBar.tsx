import type { ComponentType } from "react";
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
  label: string;
  Icon: ComponentType<{ size?: number }>;
}> = [
  { id: "home", label: "หน้าแรก", Icon: IconHome },
  { id: "pockets", label: "กล่องเงิน", Icon: IconBox },
  { id: "reports", label: "รายงาน", Icon: IconChart },
  { id: "tax", label: "ภาษี", Icon: IconPercent },
  { id: "settings", label: "ตั้งค่า", Icon: IconGear },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ id, label, Icon }) => {
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
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
