import type { SquarePaymentRecord } from "./paymentReport";

export function completedAppointmentIds(
  sessions: Array<{ customerSquareId: string | null; startAt: number; endAt: number | null }>,
  appointments: SquarePaymentRecord[],
): Set<string> {
  const claimedIds = new Set<string>();
  const completedIds = new Set<string>();
  const finished = [...sessions]
    .filter((session) => session.endAt !== null)
    .sort((a, b) => a.startAt - b.startAt);

  for (const session of finished) {
    const appointment = appointmentForSession(session, appointments, claimedIds);
    if (!appointment) continue;
    claimedIds.add(appointment.id);
    completedIds.add(appointment.id);
  }

  return completedIds;
}

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
