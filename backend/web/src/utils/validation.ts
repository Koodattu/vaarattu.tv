export class RequestValidationError extends Error {}

export function parsePositiveInteger(value: unknown, name: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new RequestValidationError(`${name} must be a positive integer`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 2147483647) throw new RequestValidationError(`${name} is outside the supported range`);
  return number;
}

export function parseOptionalId(value: unknown, name: string): number | undefined {
  return value === undefined ? undefined : parsePositiveInteger(value, name);
}

export function parseTextQuery(value: unknown, name: string, maxLength = 300): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maxLength) throw new RequestValidationError(`${name} must be text of at most ${maxLength} characters`);
  return value.trim() || undefined;
}

export function parseChoice<T extends string>(value: unknown, name: string, choices: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !choices.includes(value as T)) throw new RequestValidationError(`Invalid ${name}`);
  return value as T;
}
