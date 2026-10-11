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
 * A number that counts up when it scrolls into view. The final value is in the
 * markup (SEO, no JS), and `enhance-articles` animates it. See PLAN.md, P8.
 */
export function Stat({ value, format = "plain", currency, locale = "fr-FR", suffix }: StatProps) {
  const formatted = formatNumber(value, { format, currency, locale });

  return (
    <span
      className="mdx-stat"
      data-stat
      data-value={String(value)}
      data-format={format}
      data-currency={currency ?? ""}
      data-locale={locale}
    >
      <span className="mdx-stat-value">{formatted}</span>
      {suffix ? <span className="mdx-stat-suffix">{suffix}</span> : null}
    </span>
  );
}
