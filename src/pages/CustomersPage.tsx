import { useState } from "react";
import { useStore, store } from "@/lib/store";
import { AvatarTile } from "@/components/AvatarTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const visible = customers
    .filter((c) => !c.archived)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground mb-2">
            Clients
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Your client roster
          </h2>
        </div>
        <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-12 rounded-xl"
          />
          <Button
            onClick={() => setAdding(true)}
            className="h-12 rounded-xl px-5"
          >
            <Plus className="w-4 h-4 mr-2" /> Add client
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)]"
          >
            <AvatarTile name={c.name} color={c.color} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{c.name}</p>
              {c.phone && (
                <p className="text-sm text-muted-foreground truncate">{c.phone}</p>
              )}
              {c.note && (
                <p className="text-xs text-muted-foreground truncate">{c.note}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-11 w-11"
              onClick={() => setEditing(c)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-2xl">
            No clients yet.
          </div>
        )}
      </div>

      <CustomerDialog
        open={adding}
        onOpenChange={setAdding}
        onSubmit={(v) => {
          store.addCustomer(v.name, v.phone, v.note);
          toast.success("Client added");
        }}
      />
      <CustomerDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={(v) => {
          if (!editing) return;
          store.updateCustomer(editing.id, v);
          toast.success("Client updated");
        }}
        onDelete={() => {
          if (!editing) return;
          if (!confirm(`Archive ${editing.name}? Past sessions will be kept.`))
            return;
          store.deleteCustomer(editing.id);
          toast.success("Client archived");
          setEditing(null);
        }}
      />
    </div>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Customer;
  onSubmit: (v: { name: string; phone?: string; note?: string }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  // reset on open
  useStateOnOpen(open, () => {
    setName(initial?.name ?? "");
    setPhone(initial?.phone ?? "");
    setNote(initial?.note ?? "");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Edit client" : "Add client"}
          </DialogTitle>
          <DialogDescription>
            Clients show up in the picker when starting a session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cname">Name</Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="cphone">Phone (optional)</Label>
            <Input
              id="cphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="cnote">Note (optional)</Label>
            <Input
              id="cnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 mt-1.5"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
            <Button variant="ghost" onClick={onDelete} className="text-danger">
              <Trash2 className="w-4 h-4 mr-2" /> Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!name.trim()) return;
                onSubmit({
                  name: name.trim(),
                  phone: phone.trim() || undefined,
                  note: note.trim() || undefined,
                });
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
function useStateOnOpen(open: boolean, fn: () => void) {
  useEffect(() => {
    if (open) fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
