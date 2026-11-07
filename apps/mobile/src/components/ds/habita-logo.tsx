import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useThemeColors } from "@/hooks/use-theme";

interface HabitaLogoProps {
  size?: number;
}

export function HabitaLogo({ size = 48 }: HabitaLogoProps) {
  const colors = useThemeColors();

  return (
    <Svg width={size} height={size} viewBox="0 0 192 192" fill="none">
      <Path
        d="M96 8L16 80V172C16 180.837 23.163 188 32 188H160C168.837 188 176 180.837 176 172V80L96 8Z"
        fill={colors.monte}
      />
      <Path d="M96 8L16 80H176L96 8Z" fill={colors.monte} />
      <Rect x={56} y={88} width={18} height={72} rx={9} fill={colors.paper} />
      <Rect x={118} y={88} width={18} height={72} rx={9} fill={colors.paper} />
      <Rect x={56} y={112} width={80} height={16} rx={8} fill={colors.paper} />
      <Circle cx={65} cy={74} r={10} fill={colors.manteca} />
      <Circle cx={127} cy={74} r={10} fill={colors.manteca} />
    </Svg>
  );
}
