import chalk from 'chalk';
import {Contract} from 'ethers';
import {ethers} from 'hardhat';
import fs from 'fs';

export const isDeployedAt = async (
  contractName: string,
  address: string
): Promise<Contract | null> => {
  try {
    const ct = await ethers.getContractAt(contractName, address);
    return await ct.deployed();
  } catch {
    return null;
  }
};

export const loadResults = (
  resultFilePath: string
): Promise<Record<string, string>> => {
  return new Promise<Record<string, string>>((resolve, reject) => {
    fs.readFile(resultFilePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        if (!data.length) {
          return {};
        }
        const json = JSON.parse(data.toString()) as Record<string, string>;
        console.log(chalk.green('Result loaded'));
        console.log(
          Object.keys(json)
            .map((k) => `${k}: ${chalk.yellow(json[k])}`)
            .join('\n')
        );
        resolve(json);
      }
    });
  });
};

export const persistResult = async (
  results: Record<string, string>,
  resultFilePath: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const str = JSON.stringify(results, null, 2);
    fs.writeFile(resultFilePath, str, (err) => {
      if (err) {
        console.log('Failed to save results');
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
