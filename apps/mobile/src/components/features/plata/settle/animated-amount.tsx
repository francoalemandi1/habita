import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { TextStyle } from "react-native";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";

interface AnimatedAmountProps {
  from: number;
  to: number;
  durationMs: number;
  style?: TextStyle;
}

/** §8.3 "cambio de monto": numeric tween, ≤400ms, instant when durationMs is 0 (reduced motion). */
export function AnimatedAmount({ from, to, durationMs, style }: AnimatedAmountProps): React.JSX.Element {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (durationMs <= 0) return;

    let frame: number;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / durationMs);
      setValue(from + (to - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);

  const displayValue = durationMs <= 0 ? to : value;

  return <Text style={[{ fontVariant: ["tabular-nums"] }, style]}>{formatCurrencyArs(displayValue)}</Text>;
}
