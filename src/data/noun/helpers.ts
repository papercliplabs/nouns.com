import { getNounData } from "@/utils/nounImages/nounImage";
import { Noun } from "./types";
import { getAddress } from "viem";

function extractNameFromFileName(filename: string) {
  return filename.substring(filename.indexOf("-") + 1);
}

export interface IndexerNoun {
  id: string;
  owner: string;
  seed: Record<
    "background" | "body" | "accessory" | "head" | "glasses",
    string | number | bigint
  >;
}

export function transformQueryNounToNoun(queryNoun: IndexerNoun): Noun {
  const seed = {
    background: Number(queryNoun.seed.background),
    body: Number(queryNoun.seed.body),
    accessory: Number(queryNoun.seed.accessory),
    head: Number(queryNoun.seed.head),
    glasses: Number(queryNoun.seed.glasses),
  };

  const { parts, background } = getNounData(seed);
  const [bodyPart, accessoryPart, headPart, glassesPart] = parts;

  return {
    id: queryNoun.id,
    owner: getAddress(queryNoun.owner),
    traits: {
      background: {
        seed: seed.background,
        name: seed.background == 0 ? "Cool" : "Warm",
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
