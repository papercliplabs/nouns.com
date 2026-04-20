import { Button } from "../ui/button";
import { LinkExternal } from "../ui/link";

export default function Settle() {
  return (
    <Button asChild className="w-full md:w-[220px]">
      <LinkExternal href="https://nouns.wtf">
        <span className="label-md">Go to nouns.wtf</span>
      </LinkExternal>
    </Button>
  );
}
