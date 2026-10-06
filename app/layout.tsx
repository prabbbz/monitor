import './globals.css';

export const metadata = {
  title: 'PRABU Remote',
  description: 'Private multi-device Android remote dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
