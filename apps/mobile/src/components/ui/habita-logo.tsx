import Svg, { Circle, Path, Rect } from "react-native-svg";

interface HabitaLogoProps {
  size?: number;
}

export function HabitaLogo({ size = 48 }: HabitaLogoProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
    >
      {/* House shape */}
      <Path
        d="M96 8L16 80V172C16 180.837 23.163 188 32 188H160C168.837 188 176 180.837 176 172V80L96 8Z"
        fill="#5260fe"
      />
      <Path
        d="M96 8L16 80H176L96 8Z"
        fill="#5260fe"
      />
      {/* H letter - left vertical */}
      <Rect x={56} y={88} width={18} height={72} rx={9} fill="#c5f07a" />
      {/* H letter - right vertical */}
      <Rect x={118} y={88} width={18} height={72} rx={9} fill="#c5f07a" />
      {/* H letter - horizontal bridge */}
      <Rect x={56} y={112} width={80} height={16} rx={8} fill="#c5f07a" />
      {/* Left dot (person head) */}
      <Circle cx={65} cy={74} r={10} fill="#c5f07a" />
      {/* Right dot (person head) */}
      <Circle cx={127} cy={74} r={10} fill="#c5f07a" />
    </Svg>
  );
}
