import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { customerProfilePath } from "@/lib/customerHistory";
import {
  AppointmentImageGallery,
  AppointmentImageUploadButtons,
  useAppointmentImages,
} from "@/components/AppointmentImages";
import { MoneyInput } from "@/components/MoneyInput";
import { Button } from "@/components/ui/button";
import {
  saveAppointmentPayment,
  syncAppointmentPaymentCopies,
} from "@/lib/appointmentPayments";
import {
  getPaymentRange,
  type AppointmentPaymentEdit,
  type SquarePaymentRecord,
} from "@/lib/paymentReport";
import { imageKeyForAppointment } from "@/lib/appointmentImages";
import { appointmentForSession } from "@/lib/sessionAppointments";
import { fetchSquareBookedAppointments } from "@/lib/squarePayments";
import { durationMs, formatDuration, fmtTime } from "@/lib/time";
import type { Customer, Session } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TodaysSessionsProps {
  sessions: Session[];
  customers: Customer[];
  now: number;
  onEditSession: (sessionId: string) => void;
}

function SessionRow({
  session,
  name,
  appointment,
  paidAmountMinor,
  tipAmountMinor,
  now,
  onEditSession,
  onCommitEdit,
}: {
  session: Session;
  name: string;
  appointment: SquarePaymentRecord | undefined;
  paidAmountMinor: number | null;
  tipAmountMinor: number | null;
  now: number;
  onEditSession: (sessionId: string) => void;
  onCommitEdit: (
    bookingId: string,
    catalogAmountMinor: number,
    patch: Partial<AppointmentPaymentEdit>,
  ) => void;
}) {
  const appointmentKey = imageKeyForAppointment(session.id, appointment?.id);
  const photos = useAppointmentImages(appointmentKey);

  return (
    <div
      className={cn(
        "p-4 sm:p-5 space-y-3",
        session.endAt === null && "bg-success/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {session.customerSquareId ? (
            <Link
              to={customerProfilePath(session.customerSquareId)}
              className="font-bold truncate hover:underline"
            >
              {name}
            </Link>
          ) : (
            <p className="font-bold truncate">{name}</p>
          )}
          <AppointmentImageUploadButtons customerName={name} {...photos} />
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1">
            <p className="font-display text-lg sm:text-xl font-semibold tabular-nums">
              {formatDuration(durationMs(session, now))}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditSession(session.id)}
              className="rounded-xl h-10 w-10"
              aria-label="Edit session"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums mt-0.5">
            {fmtTime(session.startAt)} —{" "}
            {session.endAt ? fmtTime(session.endAt) : (
              <span className="text-success">in progress</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="grid grid-cols-2 gap-2 sm:max-w-xs sm:flex-1">
          {appointment && paidAmountMinor !== null && tipAmountMinor !== null ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Paid
                </p>
                <MoneyInput
                  valueMinor={paidAmountMinor}
                  ariaLabel={`Paid for ${name}`}
                  onCommit={(amountMinor) =>
                    void onCommitEdit(appointment.id, appointment.amountMinor, {
                      paidAmountMinor: amountMinor,
                    })
                  }
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Tip
                </p>
                <MoneyInput
                  valueMinor={tipAmountMinor}
                  ariaLabel={`Tip for ${name}`}
                  onCommit={(amountMinor) =>
                    void onCommitEdit(appointment.id, appointment.amountMinor, {
                      tipAmountMinor: amountMinor,
                    })
                  }
                />
              </div>
            </>
          ) : (
            <p className="col-span-2 text-sm text-muted-foreground">
              No booked appointment to price
            </p>
          )}
        </div>
        <AppointmentImageGallery customerName={name} className="sm:ml-auto" {...photos} />
      </div>
    </div>
  );
}

export function TodaysSessions({
  sessions,
  customers,
  now,
  onEditSession,
}: TodaysSessionsProps) {
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const [appointments, setAppointments] = useState<SquarePaymentRecord[]>([]);
  const [edits, setEdits] = useState<Record<string, AppointmentPaymentEdit>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const range = useMemo(() => getPaymentRange("day", new Date()), []);

  useEffect(() => {
    const controller = new AbortController();
    setSaveError(null);

    fetchSquareBookedAppointments(range, controller.signal)
      .then(async (records) => {
        const stored = await syncAppointmentPaymentCopies(records, customersRef.current);
        if (controller.signal.aborted) return;
        setAppointments(records);
        setEdits(stored);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setSaveError(
          loadError instanceof Error ? loadError.message : "Could not load today's paid amounts",
        );
      });

    return () => controller.abort();
  }, [range]);

  const claimedIds = new Set<string>();
  const appointmentBySessionId = new Map<string, SquarePaymentRecord>();
  for (const session of sessions) {
    const appointment = appointmentForSession(session, appointments, claimedIds);
    if (appointment) {
      claimedIds.add(appointment.id);
      appointmentBySessionId.set(session.id, appointment);
    }
  }

  const commitEdit = async (
    bookingId: string,
    catalogAmountMinor: number,
    patch: Partial<AppointmentPaymentEdit>,
  ) => {
    const current = edits[bookingId] ?? {
      paidAmountMinor: catalogAmountMinor,
      tipAmountMinor: 0,
    };
    const next = { ...current, ...patch };
    setEdits((existing) => ({ ...existing, [bookingId]: next }));
    setSaveError(null);
    try {
      await saveAppointmentPayment(bookingId, next.paidAmountMinor, next.tipAmountMinor);
    } catch (commitError) {
      setSaveError(
        commitError instanceof Error ? commitError.message : "Could not save the paid amount",
      );
    }
  };

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="font-display text-2xl font-semibold">Today's sessions</h3>
        <span className="text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      {saveError ? <p className="mb-3 text-sm text-destructive">{saveError}</p> : null}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {sessions.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No sessions yet today.</div>
        )}
        {sessions.map((session, index) => {
          const customer = session.customerSquareId
            ? customers.find((item) => item.squareId === session.customerSquareId)
            : null;
          const name = customer?.name ?? session.customerName;
          const appointment = appointmentBySessionId.get(session.id);
          const paidAmountMinor = appointment
            ? (edits[appointment.id]?.paidAmountMinor ?? appointment.amountMinor)
            : null;
          const tipAmountMinor = appointment
            ? (edits[appointment.id]?.tipAmountMinor ?? 0)
            : null;

          return (
            <div key={session.id} className={index > 0 ? "border-t border-border" : undefined}>
              <SessionRow
                session={session}
                name={name}
                appointment={appointment}
                paidAmountMinor={paidAmountMinor}
                tipAmountMinor={tipAmountMinor}
                now={now}
                onEditSession={onEditSession}
                onCommitEdit={commitEdit}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
