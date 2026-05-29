import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/lib/theme';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SimPle — Social Gaming Platform',
  description: 'A premium social gaming platform. Play sharp little games with friends, climb leaderboards, and build your profile.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0A0E18' },
    { media: '(prefers-color-scheme: light)', color: '#F7F8FC' },
  ],
};

// Runs before React hydrates — sets data-theme with no flash.
// Default is always "dark"; only changes if user has an explicit saved choice.
const themeBootScript = `(function(){try{var s=localStorage.getItem('simple.theme');document.documentElement.setAttribute('data-theme',s||'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme is set client-side by the boot
    // script, so the server render won't match. React is told to ignore it.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* suppressHydrationWarning on the script silences the Chrome extension
            src-attribute injection that triggers the hydration mismatch. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} suppressHydrationWarning />
      </head>
      <body>
        <Script id="google-gis" src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
