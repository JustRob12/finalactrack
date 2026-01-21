"use client";

import dynamic from "next/dynamic";

const AppDock = dynamic(
  () => import("@/components/common/app-dock").then((mod) => mod.AppDock),
  { ssr: false }
);

const AppNavbar = dynamic(() => import("@/components/common/app-navbar"), {
  ssr: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <AppNavbar />
      <div className="max-w-4xl mx-auto px-5 lg:px-0 mb-20">
        {children}
      </div>
      <AppDock />
    </div>
  );
}
