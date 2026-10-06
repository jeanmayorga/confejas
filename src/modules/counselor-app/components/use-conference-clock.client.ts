"use client";

import { useEffect, useState } from "react";

export function useConferenceClock(initialNow: string) {
  const [now, setNow] = useState(() => new Date(initialNow));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
