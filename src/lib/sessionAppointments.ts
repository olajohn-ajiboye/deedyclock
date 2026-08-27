import type { SquarePaymentRecord } from "./paymentReport";

export function appointmentForSession(
  session: { customerSquareId: string | null; startAt: number },
  appointments: SquarePaymentRecord[],
  claimedIds: Set<string>,
): SquarePaymentRecord | undefined {
  if (!session.customerSquareId) return undefined;

  const candidates = appointments.filter(
    (appointment) =>
      appointment.customerId === session.customerSquareId && !claimedIds.has(appointment.id),
  );
  if (candidates.length === 0) return undefined;

  return candidates.reduce((closest, current) => {
    const closestDelta = Math.abs(Date.parse(closest.createdAt) - session.startAt);
    const currentDelta = Math.abs(Date.parse(current.createdAt) - session.startAt);
    return currentDelta < closestDelta ? current : closest;
  });
}
