import { http, createStorage, cookieStorage } from "wagmi";
import { mainnet, base, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { siteConfig } from "./site";

export const config = getDefaultConfig({
  appName: siteConfig.name,
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains: [mainnet, base, sepolia],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
});
