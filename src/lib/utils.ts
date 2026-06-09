import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${String(value)}`);
}
