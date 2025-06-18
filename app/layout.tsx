// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./clientLayout";

export const metadata: Metadata = {
  title: "RestoreClick",
  description: "White-glove digital restoration for your most cherished photographs.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <ClientLayout>
        {children}
      </ClientLayout>
  );
}