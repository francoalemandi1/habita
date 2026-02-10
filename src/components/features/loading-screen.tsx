import { palette } from "@/lib/design-tokens";

interface LoadingScreenProps {
  message: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-primary">
      {/* Spinner SVG – 3/4 arc, slow rotation */}
      <svg
        className="animate-[spin_3s_linear_infinite]"
        width="175"
        height="175"
        viewBox="0 0 175 175"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="87.5"
          cy="87.5"
          r="75"
          stroke={palette.lime}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="353.43 471.24"
        />
      </svg>

      <p className="text-center text-2xl font-medium text-white">
        {message}
      </p>
    </div>
  );
}
