import { initials } from "@/lib/time";
import { cn } from "@/lib/utils";

interface AvatarTileProps {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs rounded-lg",
  md: "w-12 h-12 text-sm rounded-xl",
  lg: "w-16 h-16 text-lg rounded-2xl",
  xl: "w-24 h-24 text-2xl rounded-3xl",
};

/** `color` is "H S% L%" (same as store workers). Same hue on both stops; S/L shift for a soft shine. */
function similarHueGradientStops(hsl: string): { from: string; to: string } {
  const m = hsl.trim().match(/^(\d+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) {
    const t = hsl.trim();
    return { from: t, to: `${t} / 0.78` };
  }
  const h = m[1];
  const s = Number(m[2]);
  const l = Number(m[3]);
  // Darker, slightly richer → lighter, slightly softer (hue unchanged)
  const fromS = Math.min(100, s + 10);
  const fromL = Math.max(12, l - 14);
  const toS = Math.max(8, s - 12);
  const toL = Math.min(72, l + 18);
  return {
    from: `${h} ${fromS}% ${fromL}%`,
    to: `${h} ${toS}% ${toL}%`,
  };
}

export function AvatarTile({ name, color, size = "md", className }: AvatarTileProps) {
  const { from, to } = similarHueGradientStops(color);
  return (
    <div
      className={cn(
        "grid place-items-center font-display font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] select-none",
        sizeMap[size],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${from}), hsl(${to}))`,
      }}
    >
      {initials(name) || "·"}
    </div>
  );
}
