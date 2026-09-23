import { Chrome } from "@/components/Chrome";
import { ToastProvider } from "@/components/Toast";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Emoji Reverse Engineering Evaluator",
    template: "%s · Emoji RE Evaluator",
  },
  description:
    "Visual similarity analysis between original student emojis and their Python + PyCairo reconstructions. A Computer Graphics course assessment aid.",
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>
          <Chrome>{children}</Chrome>
        </ToastProvider>
      </body>
    </html>
  );
}
