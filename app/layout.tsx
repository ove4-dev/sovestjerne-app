import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sovestjerne',
  description: 'Personlige godnatthistorier der barnet ditt er helten.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
