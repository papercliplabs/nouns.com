import { getNounData, NounSeed } from "@/utils/nounImages/nounImage";
import { Noun } from "./types";
import { Address } from "viem";

function extractNameFromFileName(filename: string): string {
  return filename.substring(filename.indexOf("-") + 1);
}

export function transformOnChainNounToNoun(
  id: string,
  owner: Address,
  seed: NounSeed,
): Omit<Noun, "secondaryListing"> {
  const { parts } = getNounData(seed);
  const [bodyPart, accessoryPart, headPart, glassesPart] = parts;

  return {
    id,
    owner,
    traits: {
      background: {
        seed: seed.background,
        name: seed.background === 0 ? "Cool" : "Warm",
      },
      body: {
        seed: seed.body,
        name: bodyPart.filename,
      },
      accessory: {
        seed: seed.accessory,
        name: extractNameFromFileName(accessoryPart.filename),
      },
      head: {
        seed: seed.head,
        name: extractNameFromFileName(headPart.filename),
      },
      glasses: {
        seed: seed.glasses,
        name: extractNameFromFileName(glassesPart.filename),
      },
    },
  };
}
