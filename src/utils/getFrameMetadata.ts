const META_TAG_REGEX = /<meta\s[^>]*>/gi;
const FRAME_PROPERTY_REGEX = /^(fc|frog|og:image|og:title)/;

function getAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match?.[1] ?? match?.[2];
}

// Replaces `getFrameMetadata` from frog/next: fetch a frame URL and return its frame meta tags as { property: content }.
// Returns {} if the frame can't be fetched.
export async function getFrameMetadata(
  url: string,
): Promise<Record<string, string>> {
  try {
    const html = await fetch(url).then((r) => r.text());

    const metadata: Record<string, string> = {};
    for (const tag of html.match(META_TAG_REGEX) ?? []) {
      const property = getAttribute(tag, "property");
      const content = getAttribute(tag, "content");
      if (
        property &&
        content !== undefined &&
        FRAME_PROPERTY_REGEX.test(property)
      ) {
        metadata[property] = content;
      }
    }
    return metadata;
  } catch {
    return {};
  }
}
