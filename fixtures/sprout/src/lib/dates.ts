/** Today's date as YYYY-MM-DD, for "watered today". */
export const today = () => new Date().toISOString().slice(0, 10);

export function wateredToday(wateredOn: string | undefined): boolean {
  return wateredOn === today();
}
