import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Contract, ContractFactory, Interface, Wallet, ethers } from "ethers";

const requiredEnv = ["RPC_URL", "PRIVATE_KEY"];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing ${key} in environment`);
}

await import("./compile.mjs");

const root = process.cwd();
const deploymentsDir = path.join(root, "deployments");
const hookDeployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "196.json"), "utf8"));
const poolDeployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, "196-pool.json"), "utf8"));

function readArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "artifacts", `${name}.json`), "utf8"));
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const network = await provider.getNetwork();
if (network.chainId !== 196n) throw new Error(`Expected X Layer chainId 196, got ${network.chainId}`);

console.log(`Triggering demo swap from ${wallet.address} on chain ${network.chainId}`);

const actorArtifact = readArtifact("PoolActor");
const actorFactory = new ContractFactory(actorArtifact.abi, actorArtifact.bytecode, wallet);
const actor = await actorFactory.deploy(hookDeployment.poolManager);
await actor.waitForDeployment();
const actorAddress = await actor.getAddress();
console.log(`PoolActor: ${actorAddress}`);

const erc20Abi = [
  "function approve(address spender,uint256 amount) external returns (bool)",
  "function allowance(address owner,address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
];
const token0 = new Contract(poolDeployment.poolKey.currency0, erc20Abi, wallet);
const token1 = new Contract(poolDeployment.poolKey.currency1, erc20Abi, wallet);
const approvalAmount = ethers.parseEther("10000");

for (const [name, token] of [
  ["currency0", token0],
  ["currency1", token1],
]) {
  const tx = await token.approve(actorAddress, approvalAmount);
  const receipt = await tx.wait();
  console.log(`${name} approve tx: ${receipt.hash}`);
}

const minSqrtPricePlusOne = 4295128740n;
const tickLower = -600;
const tickUpper = 600;
const liquidityDelta = ethers.parseEther("1000");
const amountSpecified = -ethers.parseEther("1");

const tx = await actor.addLiquidityAndSwap(
  poolDeployment.poolKey,
  tickLower,
  tickUpper,
  liquidityDelta,
  true,
  amountSpecified,
  minSqrtPricePlusOne,
  { gasLimit: 2_500_000 },
);
const receipt = await tx.wait();
console.log(`Add liquidity + swap tx: ${receipt.hash}`);

const poolManagerInterface = new Interface([
  "event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)",
  "event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)",
]);
const decodedPoolManagerLogs = receipt.logs
  .map((log) => {
    try {
      return poolManagerInterface.parseLog(log);
    } catch {
      return null;
    }
  })
  .filter(Boolean);
const swapLog = decodedPoolManagerLogs.find((log) => log.name === "Swap");
const modifyLiquidityLog = decodedPoolManagerLogs.find((log) => log.name === "ModifyLiquidity");

const hook = new Contract(hookDeployment.riskAdaptiveFeeHook, readArtifact("RiskAdaptiveFeeHook").abi, provider);
const quotedFee = Number(await hook.quoteFee(poolDeployment.poolKey));

const out = {
  chainId: network.chainId.toString(),
  poolActor: actorAddress,
  approvalAmount: approvalAmount.toString(),
  addLiquidityAndSwapTxHash: receipt.hash,
  addLiquidityAndSwapStatus: receipt.status,
  addLiquidityAndSwapBlock: receipt.blockNumber,
  modifyLiquiditySeen: Boolean(modifyLiquidityLog),
  swapSeen: Boolean(swapLog),
  swapFee: swapLog ? Number(swapLog.args.fee) : null,
  swapAmount0: swapLog ? swapLog.args.amount0.toString() : null,
  swapAmount1: swapLog ? swapLog.args.amount1.toString() : null,
  quotedFee,
  tickLower,
  tickUpper,
  liquidityDelta: liquidityDelta.toString(),
  amountSpecified: amountSpecified.toString(),
};

fs.writeFileSync(path.join(deploymentsDir, "196-swap.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
