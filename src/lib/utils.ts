import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-VE").format(value);
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
