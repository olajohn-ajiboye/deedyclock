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

export function AvatarTile({ name, color, size = "md", className }: AvatarTileProps) {
  return (
    <div
      className={cn(
        "grid place-items-center font-display font-semibold text-primary-foreground select-none",
        sizeMap[size],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${color}), hsl(${color} / 0.7))`,
      }}
    >
      {initials(name) || "·"}
    </div>
  );
}
