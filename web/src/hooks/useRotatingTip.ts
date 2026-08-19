import { useEffect, useState } from "react";
import { TIPS } from "../shared";

export function useRotatingTip(tips: string[] = TIPS, intervalMs = 3200, active = true): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || tips.length === 0) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % tips.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [tips, intervalMs, active]);

  return tips[index] ?? "";
}
