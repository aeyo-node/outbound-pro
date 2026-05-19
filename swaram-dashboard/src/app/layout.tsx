import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "സ്വരം | Swaram — AI Voice Agents for India",
  description: "Enterprise-grade AI voice agents that speak Malayalam, Hindi, Kannada, Telugu, Marathi and more. Automate calls, boost conversions, and delight customers in their native language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
