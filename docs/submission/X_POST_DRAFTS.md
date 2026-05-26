# X Post Drafts

Create a dedicated project X account first. The official submission form requires a live X post link.

## Main Launch Post

```text
Introducing Risk Adaptive Fee Hook for #BuildX.

A Uniswap v4 Hook on X Layer that adjusts swap fees based on pool risk.

Low risk: cheap trading.
High risk: higher LP compensation.

Deployed on X Layer mainnet:
Hook: 0xB31113726d8dCc12B3650Ab00c623e153c37d080
Pool: 0x9d21001d22fb3b0532133769302b7a7754e72b771c47dcc4a38bbdc41192a022

Built for @XLayerOfficial @Uniswap @flapdotsh
```

## Proof Follow-Up

```text
Risk Adaptive Fee Hook is live and triggered by a real swap.

Risk update set the Hook quote to fee 6500.
The PoolManager Swap event emitted fee 6500.

Real swap proof:
https://www.okx.com/web3/explorer/xlayer/tx/0x5303a1d0b73d6d3c9835caf2dab994e9c4c1475e9c37b4815440713003497650

#BuildX @XLayerOfficial @Uniswap @flapdotsh
```

## Technical Thread

```text
How Risk Adaptive Fee Hook works:

1. Pool is initialized as a Uniswap v4 dynamic-fee pool.
2. A risk updater writes a pool risk score.
3. beforeSwap returns an LP fee override.
4. PoolManager applies the fee during the swap.

This gives LPs higher compensation during high-risk periods without changing normal low-risk trading.

#BuildX @XLayerOfficial @Uniswap @flapdotsh
```
