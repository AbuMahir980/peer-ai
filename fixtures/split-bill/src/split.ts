/**
 * Splits a bill between people, in cents. The shares always add up to the total: when it doesn't
 * divide evenly, the first people pay one cent more.
 */
export function split(totalCents: number, people: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError("totalCents must be a whole number of cents, 0 or more");
  }
  if (!Number.isInteger(people) || people < 1) {
    throw new RangeError("people must be a whole number, 1 or more");
  }
  const base = Math.floor(totalCents / people);
  const remainder = totalCents - base * people;
  return Array.from({ length: people }, (_, i) => base + (i < remainder ? 1 : 0));
}
