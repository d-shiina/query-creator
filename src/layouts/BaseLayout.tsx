import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import NavigationMenu from "@/components/template/NavigationMenu";
import Footer from "@/components/template/Footer";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DragWindowRegion title="kintone Query Creator" />
      <NavigationMenu />
      <main className="h-screen p-2 pb-20 sm:pb-16">{children}</main>
      <Footer />
    </>
  );
}
