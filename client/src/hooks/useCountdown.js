import { useEffect, useState } from "react";
// Seconds until `target` (negative once passed). Ticks every second.
export default function useCountdown(target) {
  const calc = () => Math.round((new Date(target).getTime() - Date.now()) / 1000);
  const [s, setS] = useState(calc);
  useEffect(() => { setS(calc()); const t = setInterval(() => setS(calc()), 1000); return () => clearInterval(t); }, [target]);
  return s;
}
