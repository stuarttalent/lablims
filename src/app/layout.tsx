import type { Metadata } from "next";
import { Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME } from "@/lib/app-brand";
import { getServerSupabaseConfig } from "@/lib/supabase/server-config";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Laboratory Information System`,
  description:
    "Laboratory information system with HL7 FHIR–oriented interoperability exports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseConfig = getServerSupabaseConfig();

  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders supabaseConfig={supabaseConfig}>{children}</AppProviders>
      </body>
    </html>
  );
}
