export type NumberFormat = "plain" | "currency" | "percent" | "compact";

export interface FormatNumberOptions {
  format?: NumberFormat;
  currency?: string;
  locale?: string;
}

/** Format a number with Intl. Shared by the SSR component and the client enhancer. */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  const { format = "plain", currency = "EUR", locale = "fr-FR" } = options;

  const intl: Intl.NumberFormatOptions =
    format === "currency"
      ? { style: "currency", currency }
      : format === "percent"
        ? { style: "percent" }
        : format === "compact"
          ? { notation: "compact" }
          : {};

  return new Intl.NumberFormat(locale, intl).format(value);
}
