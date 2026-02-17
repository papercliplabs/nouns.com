"use client";
import { ButtonHTMLAttributes, useCallback } from "react";
import { ONLY_TREASURY_NOUNS_FILTER_KEY } from "./TreasuryNounFilter";
import { useSearchParams } from "next/navigation";
import { INSTANT_SWAP_FILTER_KEY } from "./InstantSwapFilter";
import { cn } from "@/utils/shadcn";
import { scrollToNounExplorer } from "@/utils/scroll";

export function ClearAllFiltersButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const searchParams = useSearchParams();

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(ONLY_TREASURY_NOUNS_FILTER_KEY);
    params.delete(INSTANT_SWAP_FILTER_KEY);
    params.delete("background[]");
    params.delete("head[]");
    params.delete("glasses[]");
    params.delete("accessory[]");
    params.delete("body[]");
    window.history.pushState(null, "", `?${params.toString()}`);
    scrollToNounExplorer();
  }, [searchParams]);

  return <button onClick={() => clearAllFilters()} className={cn("hover:brightness-75", className)} {...props} />;
}
