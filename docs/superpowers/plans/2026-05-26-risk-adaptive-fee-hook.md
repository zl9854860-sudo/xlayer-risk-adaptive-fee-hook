# Risk Adaptive Fee Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Uniswap v4 dynamic-fee Hook for X Layer that raises swap fees as a pool risk score increases.

**Architecture:** Keep the build small and self-contained. Mirror only the Uniswap v4 interfaces and value types needed for the Hook, implement a focused risk-to-fee Hook, and provide scripts for compile, salt mining, and CREATE2 deployment.

**Tech Stack:** Solidity 0.8.30 via `solc-js`, Node.js ESM scripts, `ethers` v6, built-in Node test runner.

---

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

- [x] **Step 1: Add npm scripts**

Define `compile`, `test`, `mine:salt`, and `deploy:xlayer` scripts.

- [x] **Step 2: Document local and deployment commands**

Document `npm install`, `npm test`, `npm run compile`, and `npm run deploy:xlayer`.

### Task 2: Minimal v4 Compatibility Layer

**Files:**
- Create: `contracts/v4/interfaces/IHooks.sol`
- Create: `contracts/v4/interfaces/IPoolManagerMinimal.sol`
- Create: `contracts/v4/types/*.sol`
- Create: `contracts/v4/libraries/LPFeeLibrary.sol`
- Create: `contracts/v4/base/BaseHook.sol`
- Create: `contracts/v4/base/BaseOverrideFee.sol`

- [x] **Step 1: Add ABI-compatible v4 types**

Mirror only the types used by hook callbacks: `PoolKey`, `SwapParams`, `ModifyLiquidityParams`, `BalanceDelta`, `BeforeSwapDelta`, `Currency`, and `PoolId`.

- [x] **Step 2: Add hook permission validation**

Validate the low 14 bits of the Hook address against `afterInitialize` and `beforeSwap` permissions.

- [x] **Step 3: Add dynamic fee override base**

Return `fee | 0x400000` from `beforeSwap` and reject non-dynamic pools in `afterInitialize`.

### Task 3: Product Hook

**Files:**
- Create: `contracts/RiskAdaptiveFeeHook.sol`
- Create: `src/riskFee.mjs`
- Create: `test/riskFee.test.mjs`

- [x] **Step 1: Implement fee bounds and owner/updater control**

Support owner fee configuration and owner/updater risk snapshots.

- [x] **Step 2: Implement risk-to-fee curve**

Use calm, warm, and alert bands from the design doc.

- [x] **Step 3: Test fee math and permission mask**

Use the same constants in JS tests to prevent accidental drift.

### Task 4: Compile and Deploy Scripts

**Files:**
- Create: `scripts/compile.mjs`
- Create: `scripts/mine-create2-salt.mjs`
- Create: `scripts/deploy-xlayer.mjs`
- Create: `contracts/utils/HookCreate2Deployer.sol`

- [x] **Step 1: Compile with solc-js**

Gather all local Solidity files and write artifacts to `artifacts/`.

- [x] **Step 2: Mine CREATE2 salt**

Find a salt that gives a Hook address with low bits `0x1080`.

- [x] **Step 3: Deploy on X Layer**

Deploy `HookCreate2Deployer`, mine salt, deploy Hook, and write deployment JSON.

### Task 5: Verification

**Files:**
- Modify: generated `package-lock.json`

- [x] **Step 1: Install npm dependencies**

Run `npm install`.

- [x] **Step 2: Run tests**

Run `npm test`; expected result is all Node tests passing.

- [x] **Step 3: Compile contracts**

Run `npm run compile`; expected result is artifacts for `RiskAdaptiveFeeHook` and `HookCreate2Deployer`.

- [x] **Step 4: Check git status**

Run `git status --short` and confirm only intended project files were created.
