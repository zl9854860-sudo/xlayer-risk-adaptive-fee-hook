import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = process.cwd();
const contractsDir = path.join(root, "contracts");
const artifactsDir = path.join(root, "artifacts");

function walkSolidityFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSolidityFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".sol") ? [fullPath] : [];
  });
}

const sources = Object.fromEntries(
  walkSolidityFiles(contractsDir).map((file) => [
    path.relative(root, file),
    { content: fs.readFileSync(file, "utf8") },
  ]),
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors ?? [];
const fatalErrors = errors.filter((error) => error.severity === "error");

for (const error of errors) {
  const stream = error.severity === "error" ? process.stderr : process.stdout;
  stream.write(`${error.formattedMessage}\n`);
}

if (fatalErrors.length > 0) {
  process.exitCode = 1;
  throw new Error(`Solidity compile failed with ${fatalErrors.length} error(s)`);
}

fs.rmSync(artifactsDir, { recursive: true, force: true });
fs.mkdirSync(artifactsDir, { recursive: true });

for (const [sourceName, contracts] of Object.entries(output.contracts)) {
  for (const [contractName, artifact] of Object.entries(contracts)) {
    const outPath = path.join(artifactsDir, `${contractName}.json`);
    fs.writeFileSync(
      outPath,
      `${JSON.stringify(
        {
          contractName,
          sourceName,
          abi: artifact.abi,
          bytecode: `0x${artifact.evm.bytecode.object}`,
          deployedBytecode: `0x${artifact.evm.deployedBytecode.object}`,
        },
        null,
        2,
      )}\n`,
    );
  }
}

console.log(`Compiled ${Object.keys(output.contracts).length} Solidity source files into ${artifactsDir}`);
