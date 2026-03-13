interface HabitaLogoProps {
  /** Size in pixels (width & height). Defaults to 48. */
  size?: number;
  className?: string;
}

export function HabitaLogo({ size = 48, className }: HabitaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Habita"
    >
      {/* House shape */}
      <path
        d="M96 8L16 80V172C16 180.837 23.163 188 32 188H160C168.837 188 176 180.837 176 172V80L96 8Z"
        fill="#5260fe"
      />
      {/* Roof peak rounded */}
      <path
        d="M96 8L16 80H176L96 8Z"
        fill="#5260fe"
      />
      {/* H letter - left vertical */}
      <rect x="56" y="88" width="18" height="72" rx="9" fill="#c5f07a" />
      {/* H letter - right vertical */}
      <rect x="118" y="88" width="18" height="72" rx="9" fill="#c5f07a" />
      {/* H letter - horizontal bridge */}
      <rect x="56" y="112" width="80" height="16" rx="8" fill="#c5f07a" />
      {/* Left dot (person head) */}
      <circle cx="65" cy="74" r="10" fill="#c5f07a" />
      {/* Right dot (person head) */}
      <circle cx="127" cy="74" r="10" fill="#c5f07a" />
    </svg>
  );
}
