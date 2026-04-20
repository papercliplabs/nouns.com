import { LinkExternal } from "./ui/link";

export default function ReadOnlyBanner() {
  return (
    <div className="w-full bg-semantic-warning-light px-4 py-2 text-center label-sm md:label-md">
      Nouns.com is now read-only.
      <br className="md:hidden" /> Visit{" "}
      <LinkExternal href="https://nouns.wtf" className="underline">
        nouns.wtf
      </LinkExternal>{" "}
      to bid and vote.
    </div>
  );
}
