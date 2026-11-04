"use client";

import { useEffect, useState } from "react";
import { formatCurrencyArs } from "../saldos/saldos-logic";

interface AnimatedAmountProps {
  from: number;
  to: number;
  durationMs: number;
}

/** §8.3 "cambio de monto": numeric tween, ≤400ms, instant when durationMs is 0 (reduced motion). */
export function AnimatedAmount({ from, to, durationMs }: AnimatedAmountProps): React.JSX.Element {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (durationMs <= 0) return;

    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(from + (to - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);

  const displayValue = durationMs <= 0 ? to : value;

  return <span className="tabular-nums">{formatCurrencyArs(displayValue)}</span>;
}
