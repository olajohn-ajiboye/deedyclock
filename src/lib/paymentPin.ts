export function configuredPaymentsPin(): string {
  return (import.meta.env.VITE_PAYMENTS_PIN ?? "").trim();
}

export function isValidPaymentsPin(
  pin: string,
  expected: string = configuredPaymentsPin(),
): boolean {
  return Boolean(expected) && pin === expected;
}
