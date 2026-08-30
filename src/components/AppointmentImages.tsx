import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteAppointmentImage,
  listAppointmentImages,
  publicUrlForAppointmentImage,
  uploadAppointmentImage,
  type AppointmentImage,
} from "@/lib/appointmentImages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function useAppointmentImages(appointmentKey: string) {
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<AppointmentImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<AppointmentImage | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAppointmentImages(appointmentKey)
      .then((rows) => {
        if (!cancelled) setImages(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load photos");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentKey]);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const uploaded: AppointmentImage[] = [];
      for (const file of Array.from(fileList)) {
        uploaded.push(await uploadAppointmentImage(appointmentKey, file));
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload the photo");
    } finally {
      setBusy(false);
      if (libraryInputRef.current) libraryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const remove = async (image: AppointmentImage) => {
    setBusy(true);
    try {
      await deleteAppointmentImage(image);
      setImages((current) => current.filter((item) => item.id !== image.id));
      setExpanded((current) => (current?.id === image.id ? null : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the photo");
    } finally {
      setBusy(false);
    }
  };

  return {
    images,
    busy,
    expanded,
    setExpanded,
    libraryInputRef,
    cameraInputRef,
    addFiles,
    remove,
  };
}

type AppointmentImagePartsProps = {
  customerName: string;
  className?: string;
  images: AppointmentImage[];
  busy: boolean;
  expanded: AppointmentImage | null;
  setExpanded: (image: AppointmentImage | null) => void;
  libraryInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  addFiles: (fileList: FileList | null) => Promise<void>;
  remove: (image: AppointmentImage) => Promise<void>;
};

function AppointmentImageFileInputs({
  busy,
  libraryInputRef,
  cameraInputRef,
  addFiles,
}: Pick<
  AppointmentImagePartsProps,
  "busy" | "libraryInputRef" | "cameraInputRef" | "addFiles"
>) {
  return (
    <>
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden="true"
        disabled={busy}
        onChange={(event) => void addFiles(event.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        disabled={busy}
        onChange={(event) => void addFiles(event.target.files)}
      />
    </>
  );
}

export function AppointmentImageUploadButtons({
  customerName,
  className,
  busy,
  libraryInputRef,
  cameraInputRef,
  addFiles,
}: Pick<
  AppointmentImagePartsProps,
  "customerName" | "className" | "busy" | "libraryInputRef" | "cameraInputRef" | "addFiles"
>) {
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <AppointmentImageFileInputs
        busy={busy}
        libraryInputRef={libraryInputRef}
        cameraInputRef={cameraInputRef}
        addFiles={addFiles}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-12 rounded-xl shrink-0"
        disabled={busy}
        aria-label={`Take photo for ${customerName}`}
        onClick={() => cameraInputRef.current?.click()}
      >
        <Camera className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-12 rounded-xl shrink-0"
        disabled={busy}
        aria-label={`Add photos for ${customerName}`}
        onClick={() => libraryInputRef.current?.click()}
      >
        <ImagePlus className="h-5 w-5" />
      </Button>
    </div>
  );
}

export function AppointmentImageGallery({
  customerName,
  className,
  images,
  busy,
  expanded,
  setExpanded,
  remove,
}: Pick<
  AppointmentImagePartsProps,
  "customerName" | "className" | "images" | "busy" | "expanded" | "setExpanded" | "remove"
>) {
  const [pendingDelete, setPendingDelete] = useState<AppointmentImage | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className={cn("flex gap-1 overflow-x-auto min-w-0", className)}>
        {images.map((image) => (
          <div key={image.id} className="relative h-12 w-12 shrink-0">
            <button
              type="button"
              className="block h-12 w-12 rounded-lg overflow-hidden border border-border"
              aria-label={`View photo for ${customerName}`}
              onClick={() => setExpanded(image)}
            >
              <img
                src={publicUrlForAppointmentImage(image.storagePath)}
                alt={`Photo for ${customerName}`}
                className="h-full w-full object-cover"
              />
            </button>
            <button
              type="button"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background border border-border grid place-items-center"
              aria-label={`Remove photo for ${customerName}`}
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                setPendingDelete(image);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the photo. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) void remove(pendingDelete);
              }}
            >
              Delete photo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={expanded !== null} onOpenChange={(open) => !open && setExpanded(null)}>
        <DialogContent className="max-w-[min(100vw-2rem,42rem)] border-0 bg-black/95 p-2 sm:p-3">
          <DialogTitle className="sr-only">Photo for {customerName}</DialogTitle>
          <DialogDescription className="sr-only">
            Expanded appointment photo for {customerName}
          </DialogDescription>
          {expanded ? (
            <img
              src={publicUrlForAppointmentImage(expanded.storagePath)}
              alt={`Photo for ${customerName}`}
              className="mx-auto max-h-[85vh] w-full object-contain rounded-lg"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppointmentImages({
  appointmentKey,
  customerName,
  className,
}: {
  appointmentKey: string;
  customerName: string;
  className?: string;
}) {
  const photos = useAppointmentImages(appointmentKey);

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <AppointmentImageGallery customerName={customerName} {...photos} />
      <AppointmentImageUploadButtons customerName={customerName} {...photos} />
    </div>
  );
}
