import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Briefly",
  description: "Your private freelancing workspace, Sanjib.",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'system';
    var resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
