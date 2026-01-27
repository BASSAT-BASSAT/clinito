'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode, useMemo } from 'react';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://befitting-buffalo-956.convex.cloud';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    return new ConvexReactClient(CONVEX_URL);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
