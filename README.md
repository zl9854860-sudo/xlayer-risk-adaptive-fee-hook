# Risk Adaptive Fee Hook

Risk Adaptive Fee Hook is a Uniswap v4 Hook for the OKX X Layer Hook the Future hackathon. It adjusts a dynamic-fee pool's swap fee before each swap based on a stored risk score for the pool.

The demo story is simple: meme and newly launched asset pools can stay cheap during normal trading, then raise fees when risk rises so LPs receive more compensation during volatile or suspicious periods.

## Hackathon Fit

- Built around Uniswap v4 Hook callbacks.
- Uses `afterInitialize` to require a dynamic-fee pool.
- Uses `beforeSwap` to return an LP fee override.
- Designed for X Layer testnet deployment through CREATE2 so the hook address carries the required v4 permission bits.
- Produces verifiable Solidity contracts and a short demo path.

## Core Mechanism

Risk is represented as basis points from `0` to `10_000`.

- `0-2,499`: calm pool, use `calmFee`.
- `2,500-5,999`: warm pool, linearly interpolate between `calmFee` and `alertFee`.
- `6,000-10,000`: alert pool, linearly interpolate between `alertFee` and `maxFee`.

The owner can set fee bounds. The owner or risk updater can update a pool's risk snapshot.

## Commands

```sh
npm install
npm test
npm run compile
```

For deployment:

```sh
cp .env.example .env
# Fill RPC_URL, PRIVATE_KEY, POOL_MANAGER, OWNER, RISK_UPDATER
npm run deploy:xlayer
```

The deploy script:

1. Compiles contracts.
2. Deploys `HookCreate2Deployer`.
3. Mines a CREATE2 salt whose hook address ends with v4 flags `0x1080`.
4. Deploys `RiskAdaptiveFeeHook`.
5. Writes `deployments/<chainId>.json`.

## Submission Checklist

- Deploy `RiskAdaptiveFeeHook` on X Layer testnet or mainnet.
- Create at least one Uniswap v4 dynamic-fee pool using the hook address.
- Submit the verifiable hook and pool addresses.
- Record a 1-3 minute video showing risk update and before-swap fee quote behavior.
- Post from a dedicated X account and tag `@XLayerOfficial`, `@Uniswap`, and `@flapdotsh`.

## X Layer Mainnet Deployment

- Chain ID: `196`
- PoolManager: `0x360e68faccca8ca495c1b759fd9eee466db9fb32`
- HookCreate2Deployer: `0xdC7d10C33847e55073EC4286064f6C4b23f724a0`
- RiskAdaptiveFeeHook: `0xB31113726d8dCc12B3650Ab00c623e153c37d080`
- Hook permission mask: `0x1080`
- Deploy tx: `0x57abac64b02ce92db9e7bf7d50fbec2acaae6332b46a2973168d82ea301a3469`
- Block: `61034730`

Explorer links:

- Hook: https://www.okx.com/web3/explorer/xlayer/address/0xB31113726d8dCc12B3650Ab00c623e153c37d080
- Deploy tx: https://www.okx.com/web3/explorer/xlayer/tx/0x57abac64b02ce92db9e7bf7d50fbec2acaae6332b46a2973168d82ea301a3469

## Demo Pool

- RISKX token: `0xc8EC34cB04fBD429A9817DEc625Ec4d4B9a8f0B3`
- xUSD token: `0x140aF82a9AE4A51106B88A4e21052f7E0ae91Cb4`
- Pool ID: `0x9d21001d22fb3b0532133769302b7a7754e72b771c47dcc4a38bbdc41192a022`
- Dynamic fee flag: `0x800000`
- Tick spacing: `60`
- Initial sqrt price X96: `79228162514264337593543950336`
- Initialize tx: `0x9910aae4550f36173bc5d8624988b9c0ad133e5aa1d47d4bf95ea9e4645ecab3`
- Risk update tx: `0x11c40fb54dd77765572a0730d5488c44ddb6ecddb3c9e67ac7c3f157b3a3ddaa`
- Quoted fee after demo risk update: `6500`

Explorer links:

- Pool initialize tx: https://www.okx.com/web3/explorer/xlayer/tx/0x9910aae4550f36173bc5d8624988b9c0ad133e5aa1d47d4bf95ea9e4645ecab3
- Risk update tx: https://www.okx.com/web3/explorer/xlayer/tx/0x11c40fb54dd77765572a0730d5488c44ddb6ecddb3c9e67ac7c3f157b3a3ddaa

## Real Swap Proof

- PoolActor: `0x165413b290861CA069566a30D0239aD5c9F89156`
- Add liquidity + swap tx: `0x5303a1d0b73d6d3c9835caf2dab994e9c4c1475e9c37b4815440713003497650`
- PoolManager `ModifyLiquidity` event: observed
- PoolManager `Swap` event: observed
- Swap fee emitted by PoolManager: `6500`
- Hook quoted fee at swap time: `6500`
- Swap input amount0: `-1000000000000000000`
- Swap output amount1: `992513937403189930`

Explorer link:

- Real swap proof tx: https://www.okx.com/web3/explorer/xlayer/tx/0x5303a1d0b73d6d3c9835caf2dab994e9c4c1475e9c37b4815440713003497650
