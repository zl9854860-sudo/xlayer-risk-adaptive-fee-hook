import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Contract, ContractFactory, Interface, Wallet, ethers, keccak256 } from "ethers";

const requiredEnv = ["RPC_URL", "PRIVATE_KEY"];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing ${key} in environment`);
}

await import("./compile.mjs");

const root = process.cwd();
const deploymentsDir = path.join(root, "deployments");
const chainDeploymentPath = path.join(deploymentsDir, "196.json");
if (!fs.existsSync(chainDeploymentPath)) {
  throw new Error("Missing deployments/196.json; deploy RiskAdaptiveFeeHook first");
}

function readArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "artifacts", `${name}.json`), "utf8"));
}

function sortAddresses(a, b) {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}

function poolIdFor(poolKey) {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)"],
    [poolKey],
  );
  return keccak256(encoded);
}

const deployment = JSON.parse(fs.readFileSync(chainDeploymentPath, "utf8"));
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const network = await provider.getNetwork();
if (network.chainId !== 196n) throw new Error(`Expected X Layer chainId 196, got ${network.chainId}`);

console.log(`Creating demo v4 pool from ${wallet.address} on chain ${network.chainId}`);

const tokenArtifact = readArtifact("DemoERC20");
const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, wallet);
const initialSupply = ethers.parseEther("1000000");

const meme = await tokenFactory.deploy("Risky Meme Demo", "RISKX", initialSupply, wallet.address);
await meme.waitForDeployment();
const memeAddress = await meme.getAddress();
console.log(`RISKX: ${memeAddress}`);

const stable = await tokenFactory.deploy("X Layer Demo USD", "xUSD", initialSupply, wallet.address);
await stable.waitForDeployment();
const stableAddress = await stable.getAddress();
console.log(`xUSD: ${stableAddress}`);

const [currency0, currency1] = sortAddresses(memeAddress, stableAddress);
const dynamicFeeFlag = 0x800000;
const poolKey = {
  currency0,
  currency1,
  fee: dynamicFeeFlag,
  tickSpacing: 60,
  hooks: deployment.riskAdaptiveFeeHook,
};
const sqrtPriceX96 = 79228162514264337593543950336n;
const poolId = poolIdFor(poolKey);

const poolManagerAbi = [
  "function initialize((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key,uint160 sqrtPriceX96) external returns (int24 tick)",
  "event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)",
];
const poolManager = new Contract(deployment.poolManager, poolManagerAbi, wallet);
const predictedTick = await poolManager.initialize.staticCall(poolKey, sqrtPriceX96);
console.log(`Initialize staticCall tick: ${predictedTick}`);

const initializeTx = await poolManager.initialize(poolKey, sqrtPriceX96, { gasLimit: 1_000_000 });
const initializeReceipt = await initializeTx.wait();
console.log(`Pool initialize tx: ${initializeReceipt.hash}`);

const poolManagerInterface = new Interface(poolManagerAbi);
const initializeLog = initializeReceipt.logs
  .map((log) => {
    try {
      return poolManagerInterface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find((log) => log?.name === "Initialize");

const hook = new Contract(deployment.riskAdaptiveFeeHook, readArtifact("RiskAdaptiveFeeHook").abi, wallet);
let riskTxHash = null;
let quoteFee = null;
let riskUpdateSkipped = false;
if (wallet.address.toLowerCase() === deployment.riskUpdater.toLowerCase() || wallet.address.toLowerCase() === deployment.owner.toLowerCase()) {
  const label = ethers.encodeBytes32String("ALERT_DEMO");
  const riskTx = await hook.setPoolRisk(poolKey, 8_000, 7_200, 8_600, label, { gasLimit: 250_000 });
  const riskReceipt = await riskTx.wait();
  riskTxHash = riskReceipt.hash;
  quoteFee = Number(await hook.quoteFee(poolKey));
  console.log(`Risk update tx: ${riskTxHash}`);
  console.log(`Quoted fee after risk update: ${quoteFee}`);
} else {
  riskUpdateSkipped = true;
  quoteFee = Number(await hook.quoteFee(poolKey));
  console.log("Risk update skipped: deployer is not owner or risk updater");
}

const poolDeployment = {
  chainId: network.chainId.toString(),
  deployer: wallet.address,
  tokens: {
    riskMemeDemo: memeAddress,
    xLayerDemoUsd: stableAddress,
  },
  poolKey,
  poolId,
  initializeTxHash: initializeReceipt.hash,
  initializeBlock: initializeReceipt.blockNumber,
  initializedTick: initializeLog ? initializeLog.args.tick.toString() : predictedTick.toString(),
  riskUpdateTxHash: riskTxHash,
  riskUpdateSkipped,
  quotedFee: quoteFee,
  sqrtPriceX96: sqrtPriceX96.toString(),
};

fs.writeFileSync(path.join(deploymentsDir, "196-pool.json"), `${JSON.stringify(poolDeployment, null, 2)}\n`);
console.log(JSON.stringify(poolDeployment, null, 2));
