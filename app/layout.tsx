import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Topline Intake",
  description: "Startup intake and deal dossiers for Topline Ventures",
};

// Applies the saved theme before first paint.
const themeScript = `try{var t=localStorage.getItem('topline.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
          <TopBar />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
