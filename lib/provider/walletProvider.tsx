"use client";
import "@rainbow-me/rainbowkit/styles.css";
import {
  Chain,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  base,
  celo,
  celoAlfajores,
  polygonAmoy,
  rootstockTestnet,
  saga,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";

export const sagaIFI = {
  id: 2743859179913000,
  name: "intentfi",
  iconUrl: "https://i.ibb.co/kvX4fyr/Logo-Intent-Fi.png",
  iconBackground: "#fff",
  nativeCurrency: { name: "intentfi", symbol: "IFI", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://intentfi-2743859179913000-1.jsonrpc.sagarpc.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "SagaExplorer",
      url: "https://intentfi-2743859179913000-1.sagaexplorer.io",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 11_907_934,
    },
  },
} as const satisfies Chain;
const config = getDefaultConfig({
  appName: "IntentFI",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
  chains: [
    celo,
    saga,
    base,
    rootstockTestnet,
    polygonAmoy,
    sagaIFI,
    celoAlfajores,
  ],
  ssr: true,
});

const queryClient = new QueryClient();

const WalletProvider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletProvider;
