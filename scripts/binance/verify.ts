import path from 'path';
import {loadResults} from './utils';
import fs from 'fs';

let results: Record<string, string> = {};
const resultFilePath = path.resolve(__dirname, 'results.json');
const verifyFilePath = path.resolve(__dirname, 'verify.sh');

const verify = (
  x: TemplateStringsArray,
  contractName: string,
  contractAddress: string,
  args: string
) => {
  return `# verify ${contractName}
npx hardhat verify ${x[0]}${contractAddress} ${args}`;
};

const writeFile = (text: string) => {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(
      verifyFilePath,
      `#!/usr/bin/env sh

${text}
`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
};

const main = async () => {
  results = await loadResults(resultFilePath);

  const text = Object.keys(results)
    .filter((t) => t.startsWith('verify-'))
    .map((key) => {
      const params = JSON.parse(results[key]) as string[];
      const contractName = key.replace('verify-', '');
      const contractAddress = results[contractName];

      const res = verify`--network bsc ${contractName} ${contractAddress} ${params
        .map((x) => `"${x}"`)
        .join(' ')}`;
      return res;
    })
    .join('\n\n');

  await writeFile(text);
};

main()
  .then()
  .catch((e) => {
    console.log(e);
  });
