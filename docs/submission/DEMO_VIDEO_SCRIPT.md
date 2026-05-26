# Demo Video Script

Target length: 1-3 minutes.

## 0:00-0:15 Problem

Meme and newly launched asset pools often move from calm trading into high-risk volatility very quickly. Static pool fees do not respond to that change, so LPs can be underpaid during the exact moments when risk is highest.

## 0:15-0:35 Product

Risk Adaptive Fee Hook is a Uniswap v4 Hook deployed on X Layer mainnet. It stores a risk score for each pool and converts that score into a dynamic swap fee. Low-risk trading stays cheap; high-risk trading raises the fee so LPs receive more compensation.

## 0:35-1:05 Hook Mechanism

The Hook uses `afterInitialize` to require a dynamic-fee v4 pool, and `beforeSwap` to return an LP fee override. In this demo, the risk score is set by a trusted updater. A later version can compute the score with an off-chain AI agent using volatility, social, and trading signals.

Show:

- Hook contract address: `0xB31113726d8dCc12B3650Ab00c623e153c37d080`
- Hook permission mask: `0x1080`
- Pool ID: `0x9d21001d22fb3b0532133769302b7a7754e72b771c47dcc4a38bbdc41192a022`

## 1:05-1:45 Chain Proof

Show the deployed X Layer transactions:

- Hook deploy tx: `0x57abac64b02ce92db9e7bf7d50fbec2acaae6332b46a2973168d82ea301a3469`
- Pool initialize tx: `0x9910aae4550f36173bc5d8624988b9c0ad133e5aa1d47d4bf95ea9e4645ecab3`
- Risk update tx: `0x11c40fb54dd77765572a0730d5488c44ddb6ecddb3c9e67ac7c3f157b3a3ddaa`
- Real swap proof tx: `0x5303a1d0b73d6d3c9835caf2dab994e9c4c1475e9c37b4815440713003497650`

Mention: the Hook quoted fee was `6500`, and the PoolManager `Swap` event emitted fee `6500`.

## 1:45-2:15 Why It Matters

This is a small but reusable primitive for X Layer launch markets. Any pool can use risk-aware fees to keep normal trading efficient while compensating LPs more during stressed conditions. The mechanism is transparent, chain-verifiable, and easy to extend with richer risk models.

## 2:15-2:30 Close

Risk Adaptive Fee Hook turns a static fee curve into a risk-aware market primitive for Uniswap v4 on X Layer.
