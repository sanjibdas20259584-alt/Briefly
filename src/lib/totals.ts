// Pure helpers shared between server actions and client components.
// Kept out of "use server" files because they are not async functions.

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeTotals(
  items: { quantity: number; rate: number }[],
  taxRate: number,
  discount: number
) {
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0),
    0
  );
  const tax = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = Math.max(0, subtotal + tax - (Number(discount) || 0));
  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(total),
  };
}
