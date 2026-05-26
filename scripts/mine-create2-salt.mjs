import { getCreate2Address, hexlify, keccak256, toBeHex, zeroPadValue } from "ethers";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOOK_PERMISSION_MASK } from "../src/riskFee.mjs";

export function saltFromIndex(index) {
  return zeroPadValue(toBeHex(index), 32);
}

export function mineCreate2Salt({ deployer, initCodeHash, mask = HOOK_PERMISSION_MASK, maxIterations = 1_000_000 }) {
  for (let i = 0; i < maxIterations; i += 1) {
    const salt = saltFromIndex(i);
    const address = getCreate2Address(deployer, salt, initCodeHash);
    if ((BigInt(address) & 0x3fffn) === mask) {
      return { salt, address, iterations: i + 1 };
    }
  }
  throw new Error(`no salt found in ${maxIterations} iterations`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [, , deployer, initCodeOrHash] = process.argv;
  if (!deployer || !initCodeOrHash) {
    console.error("Usage: node scripts/mine-create2-salt.mjs <deployer> <initCode-or-initCodeHash>");
    process.exit(1);
  }

  const initCodeHash = initCodeOrHash.length === 66 ? initCodeOrHash : keccak256(hexlify(initCodeOrHash));
  const result = mineCreate2Salt({ deployer, initCodeHash });
  console.log(JSON.stringify(result, null, 2));
}
