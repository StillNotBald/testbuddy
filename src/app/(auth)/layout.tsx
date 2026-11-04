import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center bg-grouped p-4">{children}</div>;
}
