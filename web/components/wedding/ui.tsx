"use client";

/**
 * Wedding planner — shared presentational pieces.
 *
 * These deliberately reuse the Ente Nadu design tokens (--bg-surface,
 * --border, --accent, --ink-*) so the section inherits the site's theme
 * toggle for free.
 */
import type { ReactNode } from "react";

export function Stat({
  label,
  value,
  sub,
  progress,
  danger,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
  progress?: number;
  danger?: boolean;
}) {
  return (
    <div className="wStat">
      <div className="wStatLabel">{label}</div>
      <div className={`wStatValue num${danger ? " wStatDanger" : ""}`}>{value}</div>
      {sub ? <div className="wStatSub">{sub}</div> : null}
      {typeof progress === "number" ? (
        <div className="wBar">
          <i
            className={danger ? "over" : ""}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="wPanel">
      <header className="wPanelHead">
        <span>{title}</span>
        {action}
      </header>
      <div className="wPanelBody">{children}</div>
    </section>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: "text" | "date" | "time";
  ariaLabel?: string;
}) {
  return (
    <input
      className="wCellInput"
      type={type}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      className="wCellInput wNum"
      type="number"
      inputMode="numeric"
      value={value === 0 ? "" : value}
      placeholder={placeholder ?? "—"}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

export function SelectInput<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <select
      className="wCellInput"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function Check({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <input
      className="wCheck"
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

export function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="wDel" onClick={onClick} aria-label={label} title={label}>
      ✕
    </button>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="wAdd" onClick={onClick}>
      + {children}
    </button>
  );
}

export function Chip({ tone, children }: { tone: "ok" | "warn" | "bad" | "mute"; children: ReactNode }) {
  return <span className={`wChip wChip-${tone}`}>{children}</span>;
}
