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

Open <http://localhost:5173>. By default, the demo talks to
`https://api-sandbox.dimes.fi` and mints **sandbox-only JWTs pinned to a
fixed demo wallet** — you can browse markets, request quotes, and view mock
positions without a wallet. Connect a wallet on Polygon (or Polygon Amoy
testnet) to approve USDC and create sandbox positions end-to-end.

## Configuration

All config is read from Vite environment variables. See
[`.env.example`](./.env.example) for the authoritative list.

| Variable                        | Default                                | Purpose                                                                                                                                                                            |
|---------------------------------|----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `VITE_API_URL`                  | `https://api-sandbox.dimes.fi`         | Dimes API base URL.                                                                                                                                                                |
| `VITE_CHAIN_ID`                 | `137`                                  | `137` = Polygon mainnet, `80002` = Polygon Amoy testnet.                                                                                                                           |
| `VITE_RPC_URL`                  | _(unset)_                              | Optional custom RPC endpoint; leave empty to use wagmi's default.                                                                                                                  |
| `VITE_USDC_ADDRESS`             | _(sandbox mock)_                       | Collateral token the vault accepts. Defaults to the sandbox mock USDC so the demo works out of the box. See [Chains and contracts](#chains-and-contracts) for prod/testnet values. |
| `VITE_WALLETCONNECT_PROJECT_ID` | _(demo id bundled in `src/config.ts`)_ | Get a free project id at <https://cloud.walletconnect.com> if you fork for production. WalletConnect project ids are public identifiers, not secrets.                              |
| `VITE_API_KEY`                  | _(unset)_                              | ⚠ **Demo-only.** See below.                                                                                                                                                        |

## Auth: demo vs real ⚠

By default (`VITE_API_KEY` unset) the frontend runs in **demo mode**:
`POST /v1/prediction-markets/demo-token` mints a sandbox JWT scoped to the
fixed demo wallet `0xCB93661f8120A082a59642455b776311e1726420`. That wallet
is the only address the endpoint accepts, so every request — markets,
positions, quotes — is scoped to it regardless of which wallet the user has
connected. Users still connect their own wallet to sign on-chain
transactions; the JWT just always speaks for the demo wallet.

If you set `VITE_API_KEY`, the frontend instead calls
`POST /v1/prediction-markets/tokens` with `Authorization: Api-Key <key>` and
the connected wallet address, and the JWT is scoped to that wallet.

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

| Path                | Contents                                                                                                    |
|---------------------|-------------------------------------------------------------------------------------------------------------|
| `src/api/`          | One file per resource. `client.ts` is the HTTP wrapper with JWT auth + 401 retry.                           |
| `src/hooks/`        | React Query wrappers for each resource + `useAutoAuth` for token lifecycle.                                 |
| `src/contract/`     | Vault ABI, wagmi hooks for `approve`, `createPosition`, `requestClose`, and EIP-712 signature verification. |
| `src/components/`   | UI, kept deliberately small and un-clever. `ui/` has shared primitives (`Button`, `Input`, `Field`).        |
| `src/store/auth.ts` | Zustand store holding the active JWT.                                                                       |
| `src/theme.css`     | Design tokens (colors, type scale, radii). Customize here first.                                            |

The pre-connect landing page and the post-connect app are both in
`src/App.tsx`. A `/preview` route renders every component with mock data —
useful while tweaking styles.

## Chains and contracts

| Environment | Chain           | Chain ID | USDC (collateral token)                                       |
|-------------|-----------------|----------|---------------------------------------------------------------|
| Sandbox     | Polygon mainnet | `137`    | `0xD477EDbe627E94639d7E92119Ca62a461c6ce555` (mock)           |
| Production  | Polygon mainnet | `137`    | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` (bridged USDC.e) |
| Testnet     | Polygon Amoy    | `80002`  | `0x5fb7b0527851267c1ab138cac8dbcd224b411135` (mock)           |

Set `VITE_USDC_ADDRESS` to the row that matches your `VITE_API_URL`. The
default in `.env.example` is the sandbox mock.

The vault address and signer public key are fetched at runtime from
`GET /v1/prediction-markets/contract-info`.

## Scripts

| Command           | What it does                          |
|-------------------|---------------------------------------|
| `npm run dev`     | Start the Vite dev server.            |
| `npm run build`   | Type-check and build for production.  |
| `npm run lint`    | Run ESLint.                           |
| `npm run preview` | Preview the production build locally. |

## License

MIT
