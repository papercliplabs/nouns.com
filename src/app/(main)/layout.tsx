import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/Nav/MobileNav";
import { getAllNouns } from "@/data/noun/getAllNouns";
import NounDialog from "@/components/dialog/NounDialog";
import { Suspense } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex grow items-start justify-center">{children}</main>
      <Footer />
      <MobileNav />
      <Suspense fallback={null}>
        <NounsDialogWrapper />
      </Suspense>
    </>
  );
}

async function NounsDialogWrapper() {
  const allNouns = await getAllNouns();
  return <NounDialog nouns={allNouns} />;
}
