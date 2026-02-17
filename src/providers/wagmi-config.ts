import { createConfig, fallback, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { createStorage, noopStorage } from "wagmi";

import { getDefaultConfig } from "connectkit";
import { CHAIN_CONFIG } from "@/config";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [mainnet],
    transports: {
      [CHAIN_CONFIG.publicClient.chain!.id]: fallback([
        http(CHAIN_CONFIG.rpcUrl.primary),
        http(CHAIN_CONFIG.rpcUrl.fallback),
      ]),
    },

    walletConnectProjectId: "7f161c9948c4ec6b6d4ae813bd6ad24a",

    appName: "Nouns.com",
    appDescription: "Bid, explore, and swap Nouns.",

    appUrl: process.env.NEXT_PUBLIC_URL!,
    appIcon: `${process.env.NEXT_PUBLIC_URL}/app-icon.jpeg`,

    // Suppress WalletConnect SSR error: "indexedDB is not defined".
    // https://github.com/WalletConnect/walletconnect-monorepo/issues/6841
    // SSR: pass [] to skip WalletConnect init (avoids indexedDB access).
    // Client: returns undefined, so ConnectKit builds its default connectors.
    connectors: typeof indexedDB === "undefined" ? [] : undefined,

    ssr: true,
    storage: createStorage({
      storage: typeof window !== "undefined" ? window.localStorage : noopStorage,
    }),
  }),
);
