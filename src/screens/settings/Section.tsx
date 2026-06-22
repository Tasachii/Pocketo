import { type ReactNode } from "react";

export function Section({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="pb-3 text-sm font-medium text-sub">{title}</h2>
      {children}
    </section>
  );
}
