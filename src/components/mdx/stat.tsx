import type { ReactNode } from "react";
import { formatNumber, type NumberFormat } from "../../lib/format-number";

export interface StatProps {
  value: number;
  format?: NumberFormat;
  currency?: string;
  locale?: string;
  suffix?: ReactNode;
}

/**
 * A number with its final value in the markup. No counter animation: the public
 * page adds no motion. See PLAN.md, P8.
 */
export function Stat({ value, format = "plain", currency, locale = "fr-FR", suffix }: StatProps) {
  const formatted = formatNumber(value, { format, currency, locale });

  return (
    <span className="mdx-stat">
      <span className="mdx-stat-value">{formatted}</span>
      {suffix ? <span className="mdx-stat-suffix">{suffix}</span> : null}
    </span>
  );
}
