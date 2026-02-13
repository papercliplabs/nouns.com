import { NounSeed } from "@/utils/nounImages/nounImage";

type SeedTuple = readonly [number, number, number, number, number];

export function parseSeedTuple(seed: SeedTuple): NounSeed {
  return {
    background: Number(seed[0]),
    body: Number(seed[1]),
    accessory: Number(seed[2]),
    head: Number(seed[3]),
    glasses: Number(seed[4]),
  };
}
