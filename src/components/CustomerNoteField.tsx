import { useEffect, useState } from "react";
import { MessageSquare, MessageSquarePlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { visibleCustomerNote } from "@/lib/customerNotes";
import { updateCustomerNoteOnSquare } from "@/lib/squareSync";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CustomerNoteField({
  customer,
  showTitle = false,
  compact = false,
}: {
  customer: Customer;
  showTitle?: boolean;
  compact?: boolean;
}) {
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

  const editButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 shrink-0 rounded-xl",
        showTitle && "h-10 w-10",
        compact && visible && "text-primary",
      )}
      aria-label={`Edit notes for ${customer.name}`}
      title={visible ? "View notes" : "Add a note"}
      onClick={() => {
        setDraft(visible);
        setEditing(true);
      }}
    >
      {compact ? (
        visible ? (
          <MessageSquare className="h-4 w-4 fill-current" />
        ) : (
          <MessageSquarePlus className="h-4 w-4" />
        )
      ) : (
        <Pencil className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <div
      className="min-w-0"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {showTitle ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl font-semibold">Notes</h3>
            {!editing ? editButton : null}
          </div>
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
          ) : visible ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visible}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </div>
      ) : compact ? (
        editing ? (
          <Textarea
            autoFocus
            value={draft}
            disabled={saving}
            aria-label={`Notes for ${customer.name}`}
            placeholder="Add a note"
            className="min-h-[4.5rem] w-[min(100%,16rem)] rounded-xl resize-y"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void save()}
          />
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 max-w-[8.5rem] text-left rounded-xl hover:bg-muted/60 px-1 py-0.5"
            aria-label={`Edit notes for ${customer.name}`}
            title={visible || "Add a note"}
            onClick={() => {
              setDraft(visible);
              setEditing(true);
            }}
          >
            {visible ? (
              <>
                <MessageSquare className="h-4 w-4 shrink-0 text-primary fill-current" />
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {visible}
                </span>
              </>
            ) : (
              <MessageSquarePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        )
      ) : editing ? (
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
        <div className="flex items-center gap-1">
          {visible ? (
            <p className="flex-1 min-w-0 text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
              {visible}
            </p>
          ) : null}
          {editButton}
        </div>
      )}
    </div>
  );
}
