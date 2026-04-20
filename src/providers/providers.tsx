"use client";
import { ToastProvider } from "./toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import WhiskSdkProvider from "./WhiskSdkProvider";
import TanstackQueryProvider from "./TanstackQueryProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TanstackQueryProvider>
      <WhiskSdkProvider>
        <ToastProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ToastProvider>
      </WhiskSdkProvider>
    </TanstackQueryProvider>
  );
}
