import Image from "next/image";

interface HabitaLogoProps {
  /** Size in pixels (width & height). Defaults to 48. */
  size?: number;
  className?: string;
}

export function HabitaLogo({ size = 48, className }: HabitaLogoProps) {
  return (
    <Image
      src="/icon-192.png"
      alt="Habita"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
