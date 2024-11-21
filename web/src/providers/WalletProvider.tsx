"use client";
import TanstackQueryProvider from "./TanstackQueryProvider";
import { Address, fallback } from "viem";
import { http, WagmiProvider } from "wagmi";
import { CHAIN_CONFIG } from "@/config";
import { getDefaultConfig, AvatarComponent, RainbowKitProvider, DisclaimerComponent } from "@rainbow-me/rainbowkit";
import { Avatar } from "@paperclip-labs/dapp-kit/identity";
import { IDENTITY_RESOLVERS } from "@/components/Identity";

export const PROJECT_ID = "cb75b98c5532821d721e6275da3e7006";

const config = getDefaultConfig({
  chains: [CHAIN_CONFIG.chain],
  transports: {
    [CHAIN_CONFIG.publicClient.chain!.id]: fallback([
      http(CHAIN_CONFIG.rpcUrl.primary),
      http(CHAIN_CONFIG.rpcUrl.fallback),
    ]),
  },
  projectId: "cb75b98c5532821d721e6275da3e7006",

  appName: "NounSwap",
  appDescription: "Bid, explore, and swap Nouns.",
  appUrl: process.env.NEXT_PUBLIC_URL!,
  appIcon: `${process.env.NEXT_PUBLIC_URL}/app-icon.jpeg`,

  ssr: true,
});

export const CustomAvatar: AvatarComponent = ({ address, ensImage, size }) => {
  return <Avatar address={address as Address} resolvers={IDENTITY_RESOLVERS} size={size} />;
};

const Disclaimer: DisclaimerComponent = ({ Text, Link }) => (
  <Text>
    By connecting your wallet, you agree to the <Link href="/terms">Terms & Conditions</Link>.
  </Text>
);

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <TanstackQueryProvider>
        <RainbowKitProvider
          avatar={CustomAvatar}
          appInfo={{ appName: "Noun Swap", disclaimer: Disclaimer }}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </TanstackQueryProvider>
    </WagmiProvider>
  );
}
