# dimes-demo-ui

A React + Vite reference frontend for the [Dimes](https://dimes.fi) leveraged
prediction markets API. Fork it, wire it to your own backend, and ship.

## What it shows

- How to authenticate against the Dimes API
- How to fetch markets and user positions
- How to request a quote, approve USDC, and submit a leveraged position to
  the on-chain vault, including EIP-712 signature verification
- A minimal, themable UI intended as a starting point

## Quickstart

```sh
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:5173>. By default the demo talks to
`https://api-sandbox.dimes.fi` and mints **sandbox-only JWTs pinned to a
fixed demo wallet** — you can browse markets, request quotes, and view mock
positions without a wallet. Connect a wallet on Polygon (or Polygon Amoy
testnet) to approve USDC and create sandbox positions end-to-end.

## Configuration

All config is read from Vite environment variables. See
[`.env.example`](./.env.example) for the authoritative list.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `https://api-sandbox.dimes.fi` | Dimes API base URL. |
| `VITE_CHAIN_ID` | `137` | `137` = Polygon mainnet, `80002` = Polygon Amoy testnet. |
| `VITE_RPC_URL` | _(unset)_ | Optional custom RPC endpoint; leave empty to use wagmi's default. |
| `VITE_WALLETCONNECT_PROJECT_ID` | _(demo id bundled in `src/config.ts`)_ | Get a free project id at <https://cloud.walletconnect.com> if you fork for production. WalletConnect project ids are public identifiers, not secrets. |
| `VITE_API_KEY` | _(unset)_ | ⚠ **Demo-only.** See below. |

## Auth: demo vs real ⚠

By default, the frontend calls `POST /v1/prediction-markets/demo-token` to
mint a sandbox JWT. No API key required; the token is pinned to a fixed
demo wallet and cannot create real positions.

If you set `VITE_API_KEY`, the frontend instead calls
`POST /v1/prediction-markets/tokens` with `Authorization: Api-Key <key>` to
mint a real JWT scoped to your partner account.

**Do not ship a real API key in a production frontend.** Anyone who loads
your app can read the key from the bundle or from devtools. In a real
integration:

1. Keep the API key on your backend.
2. Expose a `POST /auth` (or similar) endpoint on your backend that takes
   the connected wallet address, calls Dimes' `POST /tokens` from the
   server, and returns the resulting JWT to the client.
3. Replace `src/api/auth.ts` with a call to your backend.

The `VITE_API_KEY` path exists in this repo purely so the demo runs
end-to-end with a single command, and the module is commented to make that
clear.

## Where to look

| Path | Contents |
| --- | --- |
| `src/api/` | One file per resource. `client.ts` is the HTTP wrapper with JWT auth + 401 retry. |
| `src/hooks/` | React Query wrappers for each resource + `useAutoAuth` for token lifecycle. |
| `src/contract/` | Vault ABI, wagmi hooks for `approve`, `createPosition`, `requestClose`, and EIP-712 signature verification. |
| `src/components/` | UI, kept deliberately small and un-clever. `ui/` has shared primitives (`Button`, `Input`, `Field`). |
| `src/store/auth.ts` | Zustand store holding the active JWT. |
| `src/theme.css` | Design tokens (colors, type scale, radii). Customize here first. |

The pre-connect landing page and the post-connect app are both in
`src/App.tsx`. A `/preview` route renders every component with mock data —
useful while tweaking styles.

## Chains and contracts

| Chain | Chain ID | USDC |
| --- | --- | --- |
| Polygon mainnet | `137` | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Polygon Amoy testnet | `80002` | `0x5fb7b0527851267c1ab138cac8dbcd224b411135` (mock) |

The vault contract address is not hardcoded — it's fetched at runtime from
`GET /v1/prediction-markets/contract-info`, along with the signer address
the frontend verifies offer signatures against.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check and build for production. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Preview the production build locally. |

## License

MIT
