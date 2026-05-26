import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ContractFactory, Wallet, ethers, keccak256 } from "ethers";
import { mineCreate2Salt } from "./mine-create2-salt.mjs";

const requiredEnv = ["RPC_URL", "PRIVATE_KEY", "POOL_MANAGER"];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`Missing ${key} in environment`);
}

await import("./compile.mjs");

const root = process.cwd();
const deploymentsDir = path.join(root, "deployments");

function readArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "artifacts", `${name}.json`), "utf8"));
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
const network = await provider.getNetwork();
const owner = process.env.OWNER || wallet.address;
const riskUpdater = process.env.RISK_UPDATER || owner;

console.log(`Deploying from ${wallet.address} on chain ${network.chainId}`);

const deployerArtifact = readArtifact("HookCreate2Deployer");
const deployerFactory = new ContractFactory(deployerArtifact.abi, deployerArtifact.bytecode, wallet);
const deployer = await deployerFactory.deploy();
await deployer.waitForDeployment();
const deployerAddress = await deployer.getAddress();
console.log(`HookCreate2Deployer: ${deployerAddress}`);

const hookArtifact = readArtifact("RiskAdaptiveFeeHook");
const encodedArgs = ethers.AbiCoder.defaultAbiCoder()
  .encode(["address", "address", "address"], [process.env.POOL_MANAGER, owner, riskUpdater])
  .slice(2);
const initCode = `${hookArtifact.bytecode}${encodedArgs}`;
const initCodeHash = keccak256(initCode);
const mined = mineCreate2Salt({ deployer: deployerAddress, initCodeHash });
console.log(`RiskAdaptiveFeeHook target: ${mined.address}`);
console.log(`CREATE2 salt: ${mined.salt} (${mined.iterations} iterations)`);

const tx = await deployer.deploy(mined.salt, initCode, { gasLimit: 6_000_000 });
const receipt = await tx.wait();
console.log(`Hook deploy tx: ${receipt.hash}`);

const deployment = {
  chainId: network.chainId.toString(),
  deployer: wallet.address,
  hookCreate2Deployer: deployerAddress,
  riskAdaptiveFeeHook: mined.address,
  poolManager: process.env.POOL_MANAGER,
  owner,
  riskUpdater,
  hookPermissionMask: "0x1080",
  create2Salt: mined.salt,
  txHash: receipt.hash,
};

fs.mkdirSync(deploymentsDir, { recursive: true });
fs.writeFileSync(path.join(deploymentsDir, `${network.chainId}.json`), `${JSON.stringify(deployment, null, 2)}\n`);
console.log(JSON.stringify(deployment, null, 2));
