import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteAppointmentImage,
  listAppointmentImages,
  publicUrlForAppointmentImage,
  uploadAppointmentImage,
  type AppointmentImage,
} from "@/lib/appointmentImages";
import { toast } from "sonner";

export function AppointmentImages({
  appointmentKey,
  customerName,
}: {
  appointmentKey: string;
  customerName: string;
}) {
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<AppointmentImage[]>([]);
  const [busy, setBusy] = useState(false);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex gap-1 overflow-x-auto">
        {images.map((image) => (
          <div key={image.id} className="relative h-12 w-12 shrink-0">
            <img
              src={publicUrlForAppointmentImage(image.storagePath)}
              alt={`Photo for ${customerName}`}
              className="h-12 w-12 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background border border-border grid place-items-center"
              aria-label={`Remove photo for ${customerName}`}
              disabled={busy}
              onClick={() => void remove(image)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
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
