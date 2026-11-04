import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TestBuddy',
  description: 'Open-source test management platform',
};

// Tiny no-flash theme script: applies the stored (or system) theme before first paint.
// Pattern from Next 16 docs (guides/preventing-flash-before-hydration): an inline script in <head>.
// On the server it is type "text/javascript" (it runs during HTML parsing). The client render uses
// "text/plain" so React 19 does not log "Encountered a script tag while rendering React component";
// suppressHydrationWarning keeps the DOM version of the element.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
