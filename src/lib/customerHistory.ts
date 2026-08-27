import type { SquarePaymentRecord } from "./paymentReport";

export function customerProfilePath(squareId: string): string {
  return `/customers/${encodeURIComponent(squareId)}`;
}

export function appointmentsForCustomer(
  appointments: SquarePaymentRecord[],
  customerSquareId: string,
): SquarePaymentRecord[] {
  return appointments
    .filter((appointment) => appointment.customerId === customerSquareId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
