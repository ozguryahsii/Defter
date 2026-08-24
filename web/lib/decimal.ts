/** "12,5" ve "12.5" girişlerinin ikisini de sayıya çevirir. */
export function parseDecimal(value: string): number {
  return parseFloat(value.trim().replace(",", ".")) || 0;
}
