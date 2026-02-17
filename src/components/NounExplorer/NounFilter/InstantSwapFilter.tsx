import { useSearchParams } from "next/navigation";
import { FilterItemButton } from "./FilterItemButton";
import { useCallback, useMemo } from "react";
import Icon from "../../ui/Icon";
import { scrollToNounExplorer } from "@/utils/scroll";

export const INSTANT_SWAP_FILTER_KEY = "instantSwap";

export default function InstantSwapFilter() {
  const searchParams = useSearchParams();

  const isChecked = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return params.get(INSTANT_SWAP_FILTER_KEY) === "1";
  }, [searchParams]);

  const handleInstantSwapFilterChange = useCallback(
    (checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!checked) {
        params.delete(INSTANT_SWAP_FILTER_KEY);
      } else {
        params.set(INSTANT_SWAP_FILTER_KEY, "1");
      }

      window.history.pushState(null, "", `?${params.toString()}`);
      scrollToNounExplorer();
    },
    [searchParams]
  );

  return (
    <FilterItemButton isChecked={isChecked} onClick={() => handleInstantSwapFilterChange(!isChecked)}>
      <div className="flex items-center gap-2">
        <Icon icon="swap" size={20} className="fill-content-primary" />
        <h6>Instant Swap</h6>
      </div>
    </FilterItemButton>
  );
}
