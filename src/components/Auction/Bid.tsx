import { Button } from "../ui/button";
import { LinkExternal } from "../ui/link";

export default function Bid() {
  return (
    <Button asChild className="w-full md:w-[220px]">
      <LinkExternal href="https://nouns.wtf">Bid on nouns.wtf</LinkExternal>
    </Button>
  );
}
