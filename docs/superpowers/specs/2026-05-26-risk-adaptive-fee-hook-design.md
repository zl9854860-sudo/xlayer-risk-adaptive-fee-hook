# Risk Adaptive Fee Hook Design

## Goal

Build a small, complete Uniswap v4 Hook for the OKX X Layer Hook the Future hackathon. The product is a dynamic-fee Hook for meme or newly launched asset pools: normal risk keeps trading cheap; elevated risk raises swap fees so LPs are better compensated during volatile or suspicious periods.

## Product Shape

The Hook is named `RiskAdaptiveFeeHook`. It stores one risk snapshot per v4 pool. A trusted updater can publish a risk score from `0` to `10_000`, plus lightweight volatility and social-spike metadata for demos. Before each swap, the Hook returns a fee override derived from the stored risk score.

The first demo does not depend on an external AI oracle. The "AI risk" input is simulated by an owner-controlled updater, which keeps the hackathon build deployable and easy to verify. The narrative remains compatible with a future off-chain agent that computes the risk score from social, volatility, and trading signals.

## Architecture

The Solidity layer has four units:

- `RiskAdaptiveFeeHook`: product logic, risk snapshots, fee curve, owner/updater controls.
- `BaseHook` and `BaseOverrideFee`: minimal v4 Hook scaffolding, callback permissions, dynamic fee override behavior.
- `v4/types` and `v4/interfaces`: minimal Uniswap v4 ABI-compatible types needed by the Hook.
- `HookCreate2Deployer`: deploys the Hook with CREATE2 so the Hook address carries the required permission bits.

Scripts handle compiling, CREATE2 salt mining, and deployment. Tests focus on fee math, permission flags, and compile success.

## Data Flow

1. Pool is created as a Uniswap v4 dynamic-fee pool with `fee = 0x800000` and `hooks = RiskAdaptiveFeeHook`.
2. PoolManager calls `afterInitialize`; the Hook rejects non-dynamic-fee pools.
3. Owner or risk updater calls `setPoolRisk` with a risk score and metadata.
4. PoolManager calls `beforeSwap`; the Hook reads the pool risk score and returns `fee | 0x400000`.
5. Uniswap v4 applies the returned override fee for that swap.

## Fee Curve

Default fee bounds:

- `calmFee = 500` equals 0.05%.
- `alertFee = 3_000` equals 0.30%.
- `maxFee = 10_000` equals 1.00%.

Risk from `0` to `2,499` returns calm fee. Risk from `2,500` to `5,999` interpolates calm to alert. Risk from `6,000` to `10,000` interpolates alert to max.

## Error Handling

- Reject non-owner fee configuration changes.
- Reject non-owner and non-updater risk updates.
- Reject risk scores above `10_000`.
- Reject fee bounds where `calmFee > alertFee`, `alertFee > maxFee`, or `maxFee > 1_000_000`.
- Reject Hook deployment at an address whose low bits do not match `afterInitialize + beforeSwap`.
- Reject `afterInitialize` for non-dynamic-fee pools.

## Testing

The first pass verifies:

- The JavaScript mirror of fee math returns expected calm, middle, alert, and max values.
- The v4 Hook permission mask is `0x1080`.
- The Solidity contracts compile through `solc`.

Deployment validation is performed by `scripts/deploy-xlayer.mjs`, which mines a matching salt before deploying the Hook.

## Scope Boundaries

This build does not include a full DEX UI, autonomous oracle, production risk model, or multi-chain support. It prioritizes a verifiable Hook, deployable X Layer path, and demo clarity.
