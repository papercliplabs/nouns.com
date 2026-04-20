import { Button } from "../ui/button";
import { LinkExternal } from "../ui/link";

export default function Bid() {
  return (
    <Button asChild className="w-full md:w-[220px]">
      <LinkExternal href="https://nouns.wtf">
        <span className="label-md">Bid on nouns.wtf</span>
      </LinkExternal>
    </Button>
  );
}
