import './globals.css';

export const metadata = {
  title: 'EduPulse Portal',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}