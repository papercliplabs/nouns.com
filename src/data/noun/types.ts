import { BigIntString } from "@/utils/types";
import { Address } from "viem";

export type NounTraitType = "background" | "body" | "accessory" | "head" | "glasses";

export interface NounTrait {
  seed: number;
  name: string;
}

export interface Noun {
  id: BigIntString;
  owner: Address;
  traits: Record<NounTraitType, NounTrait>;
}
