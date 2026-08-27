import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { visibleCustomerNote } from "@/lib/customerNotes";
import { updateCustomerNoteOnSquare } from "@/lib/squareSync";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";

export function CustomerNoteField({ customer }: { customer: Customer }) {
  const visible = visibleCustomerNote(customer.note);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(visible);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(visibleCustomerNote(customer.note));
  }, [customer.note, editing]);

  const save = async () => {
    const next = draft.trim();
    if (next === visible) {
      setEditing(false);
      setDraft(visible);
      return;
    }
    if (!customer.squareId || customer.squareVersion == null) {
      toast.error("Sync this client from Square before saving notes.");
      setDraft(visible);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateCustomerNoteOnSquare({
        squareId: customer.squareId,
        note: next,
        version: customer.squareVersion,
      });
      setEditing(false);
    } catch (error) {
      setDraft(visible);
      toast.error(error instanceof Error ? error.message : "Could not save the note to Square");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-w-0"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {editing ? (
        <Textarea
          autoFocus
          value={draft}
          disabled={saving}
          aria-label={`Notes for ${customer.name}`}
          placeholder="Add a note"
          className="min-h-[4.5rem] rounded-xl resize-y"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void save()}
        />
      ) : (
        <div className="flex items-start gap-1">
          {visible ? (
            <p className="flex-1 min-w-0 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
              {visible}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
            aria-label={`Edit notes for ${customer.name}`}
            onClick={() => {
              setDraft(visible);
              setEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
