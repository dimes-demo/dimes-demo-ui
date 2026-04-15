import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  phantomWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'
import { polygon, polygonAmoy } from 'wagmi/chains'


const isTestnet = Number(import.meta.env.VITE_CHAIN_ID) === 80002
const chain = isTestnet ? polygonAmoy : polygon

// WalletConnect project ids are public identifiers — they ship in the client
// bundle and the access control is enforced server-side via an origin
// allowlist on the WalletConnect Cloud dashboard. We bundle a demo id so the
// repo runs out of the box; fork operators should register their own at
// https://cloud.walletconnect.com and override via VITE_WALLETCONNECT_PROJECT_ID.
const DEMO_WALLETCONNECT_PROJECT_ID = 'cfbb587cab5df64463c2e5de5cad1f1f'
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || DEMO_WALLETCONNECT_PROJECT_ID

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, coinbaseWallet, phantomWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'Dimes Demo',
    projectId,
  },
)

export const config = createConfig({
  connectors,
  chains: [chain],
  transports: {
    [chain.id]: http(import.meta.env.VITE_RPC_URL || undefined),
  } as Record<number, ReturnType<typeof http>>,
})
