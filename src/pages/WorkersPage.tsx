import { useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Worker } from "@/lib/types";

export default function WorkersPage() {
  const workers = useStore((s) => s.workers);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [adding, setAdding] = useState(false);

  const visible = workers.filter((w) => !w.archived);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground mb-2">
            Team
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Stylists & staff
          </h2>
        </div>
        <Button
          onClick={() => setAdding(true)}
          className="sm:ml-auto h-12 rounded-xl px-5"
        >
          <Plus className="w-4 h-4 mr-2" /> Add stylist
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)]"
          >
            <AvatarTile name={w.name} color={w.color} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{w.name}</p>
              {w.hourlyRate ? (
                <p className="text-sm text-muted-foreground">
                  ${w.hourlyRate.toFixed(2)} / hr
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No rate set</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-11 w-11"
              onClick={() => setEditing(w)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <WorkerDialog
        open={adding}
        onOpenChange={setAdding}
        onSubmit={(v) => {
          store.addWorker(v.name, v.hourlyRate);
          toast.success("Stylist added");
        }}
      />
      <WorkerDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={(v) => {
          if (!editing) return;
          store.updateWorker(editing.id, v);
          toast.success("Stylist updated");
        }}
        onDelete={() => {
          if (!editing) return;
          if (!confirm(`Archive ${editing.name}? Past sessions are kept.`)) return;
          store.deleteWorker(editing.id);
          toast.success("Stylist archived");
          setEditing(null);
        }}
      />
    </div>
  );
}

function WorkerDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Worker;
  onSubmit: (v: { name: string; hourlyRate?: number }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setRate(initial?.hourlyRate?.toString() ?? "");
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Edit stylist" : "Add stylist"}
          </DialogTitle>
          <DialogDescription>
            Stylists appear on the home grid for quick clock-in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="wname">Name</Label>
            <Input
              id="wname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="wrate">Hourly rate (optional)</Label>
            <Input
              id="wrate"
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="h-12 mt-1.5"
              placeholder="0.00"
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
                const r = parseFloat(rate);
                onSubmit({
                  name: name.trim(),
                  hourlyRate: Number.isFinite(r) && r > 0 ? r : undefined,
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
