import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveAppointmentNote } from "@/lib/appointmentPayments";
import { toast } from "sonner";

export function AppointmentNoteField({
  bookingId,
  customerName,
  note,
  onSaved,
}: {
  bookingId: string;
  customerName: string;
  note: string;
  onSaved: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(note);
  }, [note, editing]);

  const save = async () => {
    const next = draft.trim();
    if (next === note) {
      setEditing(false);
      setDraft(note);
      return;
    }
    setSaving(true);
    try {
      await saveAppointmentNote(bookingId, next);
      onSaved(next);
      setEditing(false);
    } catch (error) {
      setDraft(note);
      toast.error(error instanceof Error ? error.message : "Could not save the visit note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visit note</p>
        {!editing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            aria-label={`Edit visit note for ${customerName}`}
            onClick={() => {
              setDraft(note);
              setEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {editing ? (
        <Textarea
          autoFocus
          value={draft}
          disabled={saving}
          aria-label={`Visit note for ${customerName}`}
          placeholder="Add a note for this appointment"
          className="min-h-[4.5rem] rounded-xl resize-y"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void save()}
        />
      ) : note ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No note for this visit yet.</p>
      )}
    </div>
  );
}
