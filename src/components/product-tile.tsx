/** Placeholder "image" for a product: an emoji on a colored tile (no external assets). */
export function ProductTile({
  emoji,
  color,
  size = "md",
}: {
  emoji: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-16 w-16 text-3xl",
    md: "aspect-square text-6xl",
    lg: "aspect-square text-9xl",
  };
  return (
    <div
      className={`flex items-center justify-center rounded-xl ${sizes[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {emoji}
    </div>
  );
}
