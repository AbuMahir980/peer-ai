/** A pickup's price in pounds: a base charge, plus a charge for each kilogram. */
export function quote(weightKg: number): number {
  return 3.5 + weightKg * 0.85;
}
