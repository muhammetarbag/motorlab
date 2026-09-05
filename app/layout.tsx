import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Motorlab — Dört Zamanlı Motor Laboratuvarı',
  description:
    'Benzinli motorun dört zamanlı çevrimini hareketli kesit, deneyler ve canlı grafiklerle keşfet.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body>{children}</body>
    </html>
  );
}
