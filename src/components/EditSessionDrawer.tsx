import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore, store } from "@/lib/store";
import { fromLocalInput, toLocalInput, formatDuration } from "@/lib/time";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  sessionId: string | null;
  onClose: () => void;
}

export function EditSessionDrawer({ sessionId, onClose }: Props) {
  const session = useStore((s) =>
    sessionId ? s.sessions.find((x) => x.id === sessionId) ?? null : null,
  );
  const customers = useStore((s) => s.customers);

  const [startVal, setStartVal] = useState("");
  const [endVal, setEndVal] = useState("");
  const [stillActive, setStillActive] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");

  useEffect(() => {
    if (!session) return;
    setStartVal(toLocalInput(session.startAt));
    setEndVal(session.endAt ? toLocalInput(session.endAt) : "");
    setStillActive(session.endAt === null);
    setCustomerId(session.customerId);
  }, [session?.id]);

  if (!session) {
    return (
      <Drawer open={false} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent />
      </Drawer>
    );
  }

  function handleSave() {
    const startAt = fromLocalInput(startVal);
    const endAt = stillActive ? null : fromLocalInput(endVal);
    if (Number.isNaN(startAt)) {
      toast.error("Invalid start time");
      return;
    }
    if (endAt !== null && (Number.isNaN(endAt) || endAt <= startAt)) {
      toast.error("End time must be after start time");
      return;
    }
    store.updateSession(session!.id, { startAt, endAt, customerId });
    toast.success("Session updated");
    onClose();
  }

  function handleDelete() {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    store.deleteSession(session!.id);
    toast.success("Session deleted");
    onClose();
  }

  const previewMs = (() => {
    const s = fromLocalInput(startVal);
    const e = stillActive ? Date.now() : fromLocalInput(endVal);
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
    return e - s;
  })();

  return (
    <Drawer open={!!sessionId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-xl">
          <DrawerHeader>
            <DrawerTitle className="font-display text-2xl">
              Edit session
            </DrawerTitle>
            <DrawerDescription>
              Adjust the start, end, or client for this session.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="customer">Client</Label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 text-base"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.archived ? "(archived)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startVal}
                onChange={(e) => setStartVal(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="end">End</Label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={stillActive}
                    onChange={(e) => setStillActive(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Still active
                </label>
              </div>
              <Input
                id="end"
                type="datetime-local"
                value={endVal}
                onChange={(e) => setEndVal(e.target.value)}
                disabled={stillActive}
                className="h-12 text-base"
              />
            </div>

            <div className="rounded-xl bg-muted px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="font-display text-xl font-semibold tabular-nums">
                {formatDuration(previewMs)}
              </span>
            </div>
          </div>

          <DrawerFooter className="flex-row gap-2">
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-danger hover:text-danger"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
