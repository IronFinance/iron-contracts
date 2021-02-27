import chalk from 'chalk';
import {ethers} from 'hardhat';
import {Numbers} from '../../utils/constants';
import {Contract} from 'ethers';
import path from 'path';
import {isDeployedAt, loadResults, persistResult} from './utils';

let results: Record<string, string> = {};
const resultFilePath = path.resolve(__dirname, 'results.json');

const getOrCreateContract = async (
  contractName: string,
  deployFn: () => Promise<Contract>,
  contractId?: string
): Promise<Contract> => {
  contractId = contractId || contractName;
  const address = results[contractId];
  let contract;
  if (address) {
    contract = await isDeployedAt(contractName, address);
    if (contract != null) {
      console.log(
        chalk.green(`Contract ${contractName} is existed at ${address}`)
      );
      return contract;
    }
  }

  console.log(chalk.yellow(`Begin deploy contract ${contractId}`));
  contract = await deployFn();
  results[contractId] = contract.address;
  console.log(
    chalk.green(`New contract ${contractId} is deployed to ${contract.address}`)
  );
  return contract;
};

const updateVerifyParam = (contractName: string, ...args: string[]) => {
  const key = `verify-${contractName}`;
  if (results[key]) {
    return;
  }

  results[key] = JSON.stringify(args);
};

const execute = async (taskName: string, taskFn: () => Promise<unknown>) => {
  const key = `task.${taskName}`;
  if (results[key]) {
    console.log(chalk.green(`Task ${taskName} executed`));
    return JSON.parse(results[key]);
  }

  console.log(chalk.yellow(`Try to execute task ${taskName}`));
  try {
    const res = await taskFn();
    results[key] = JSON.stringify(res || '');
    console.log(chalk.green(`Task ${taskName} executed`));
  } catch (e) {
    console.log(chalk.red(`Task ${taskName} failed to execute`));
    throw e;
  }
};

async function main() {
  results = await loadResults(resultFilePath);
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  // 0. CONSTANTS
  const strategist = '';
  const busd = {address: '0xe9e7cea3dedca5984780bafc599bd69add087d56'}; // on bsc mainnet

  // 1. timelock
  // const timelockDelay = Constants.TIMELOCK_DELAY;
  const timelockDelay = 12 * 60 * 60; // 12 hours at genesis
  const timelockAdmin = strategist;
  const timelock = await getOrCreateContract('Timelock', async () => {
    const Timelock = await ethers.getContractFactory('Timelock');
    const timelock = await Timelock.deploy(timelockAdmin, timelockDelay);
    return await timelock.deployed();
  });
  updateVerifyParam('Timelock', timelockAdmin, timelockDelay.toString());

  // 2. treasury
  const treasury = await getOrCreateContract('Treasury', async () => {
    const Treasury = await ethers.getContractFactory('Treasury');
    const treasury = await Treasury.deploy();
    return await treasury.deployed();
  });
  updateVerifyParam('Treasury');

  // 3. tokens
  const dollar = await getOrCreateContract('Dollar', async () => {
    const Dollar = await ethers.getContractFactory('Dollar');
    const dollar = await Dollar.deploy(
      'IRON Stablecoin',
      'IRON',
      treasury.address
    );
    return await dollar.deployed();
  });
  updateVerifyParam('Dollar', 'IRON Stablecoin', 'IRON', treasury.address);

  const share = await getOrCreateContract('Share', async () => {
    const Share = await ethers.getContractFactory('Share');
    const share = await Share.deploy('IRON Share', 'SIL', treasury.address);
    return await share.deployed();
  });
  updateVerifyParam('Share', 'IRON Share', 'SIL', treasury.address);

  // 4. pools
  // const poolBUSD = await getOrCreateContract('Pool', async () => {
  //   const Pool = await ethers.getContractFactory('Pool');
  //   const contract = await Pool.deploy(
  //     dollar.address,
  //     share.address,
  //     busd.address,
  //     treasury.address,
  //     Numbers.ONE_HUNDRED_MILLION_DEC18.mul(3)
  //   );
  //   return await contract.deployed();
  // });
  // updateVerifyParam(
  //   'Pool',
  //   dollar.address,
  //   share.address,
  //   busd.address,
  //   treasury.address,
  //   Numbers.ONE_HUNDRED_MILLION_DEC18.mul(3).toString()
  // );

  // 5. Oracles

  // const vSwapRouter = '0xb7e19a1188776f32E8C2B790D9ca578F2896Da7C'; // mainnet
  // const vSwapPair_DOLLAR_BUSD = '0xd1571186ef922ac0007a0be28be032792a8f902c'; // mainnet
  // const vSwapPair_SHARE_BUSD = '0xd7558092ac80f90d24da971173a8bf302fbdda45'; // mainnet

  // const oracle_DOLLAR_BUSD = await getOrCreateContract(
  //   'VSwapPairOracle',
  //   async () => {
  //     const VSwapPairOracle = await ethers.getContractFactory(
  //       'VSwapPairOracle'
  //     );
  //     const oracle_DOLLAR_BUSD = await VSwapPairOracle.deploy(
  //       vSwapPair_DOLLAR_BUSD
  //     );
  //     return await oracle_DOLLAR_BUSD.deployed();
  //   },
  //   'VSwapPairOracle_DOLLAR_BUSD'
  // );
  // updateVerifyParam('VSwapPairOracle_DOLLAR_BUSD', vSwapPair_DOLLAR_BUSD);

  // const oracle_SHARE_BUSD = await getOrCreateContract(
  //   'VSwapPairOracle',
  //   async () => {
  //     const PancakeSwapPairOracle = await ethers.getContractFactory(
  //       'VSwapPairOracle'
  //     );
  //     const oracle_SHARE_USD = await PancakeSwapPairOracle.deploy(
  //       vSwapPair_SHARE_BUSD
  //     );
  //     return await oracle_SHARE_USD.deployed();
  //   },
  //   'VSwapPairOracle_SHARE_USD'
  // );
  // updateVerifyParam('VSwapPairOracle_SHARE_USD', vSwapPair_SHARE_BUSD);

  // const chainlinkPriceFeed_BUSD_USD =
  //   '0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa';

  // const oracleBusd = await getOrCreateContract('OracleBusd', async () => {
  //   const BusdOracle = await ethers.getContractFactory('BusdOracle');
  //   const oracleBusd = await BusdOracle.deploy(chainlinkPriceFeed_BUSD_USD);
  //   return await oracleBusd.deployed();
  // });
  // updateVerifyParam('OracleBusd', chainlinkPriceFeed_BUSD_USD);

  // const oracleDollar = await getOrCreateContract('DollarOracle', async () => {
  //   const DollarOracle = await ethers.getContractFactory('DollarOracle');
  //   const oracleDollar = await DollarOracle.deploy(
  //     dollar.address,
  //     oracle_DOLLAR_BUSD.address,
  //     oracleBusd.address
  //   );
  //   return await oracleDollar.deployed();
  // });
  // updateVerifyParam(
  //   'DollarOracle',
  //   dollar.address,
  //   oracle_DOLLAR_BUSD.address,
  //   oracleBusd.address
  // );

  // const oracleShare = await getOrCreateContract('ShareOracle', async () => {
  //   const ShareOracle = await ethers.getContractFactory('ShareOracle');
  //   const oracleShare = await ShareOracle.deploy(
  //     share.address,
  //     oracle_SHARE_BUSD.address,
  //     oracleBusd.address
  //   );
  //   return await oracleShare.deployed();
  // });
  // updateVerifyParam(
  //   'ShareOracle',
  //   share.address,
  //   oracle_SHARE_BUSD.address,
  //   oracleBusd.address
  // );

  // // // 6. Tasks
  // await execute('poolBUSD.setOracle', async () => {
  //   await poolBUSD.setOracle(oracleBusd.address);
  // });

  // await execute('treasury.setDollarAddress', async () => {
  //   await treasury.setDollarAddress(dollar.address);
  // });

  // await execute('treasury.setShareAddress', async () => {
  //   await treasury.setShareAddress(share.address);
  // });

  // await execute('treasury.setOracleDollar', async () => {
  //   await treasury.setOracleDollar(oracleDollar.address);
  // });

  // await execute('treasury.setOracleShare', async () => {
  //   await treasury.setOracleShare(oracleShare.address);
  // });

  // await execute('treasury.addPool', async () => {
  //   await treasury.addPool(poolBUSD.address);
  // });

  // await execute('treasury.setStrategist', async () => {
  //   await treasury.setStrategist(strategist);
  // });

  // await execute('treasury.setRebalancePool', async () => {
  //   await treasury.setRebalancePool(poolBUSD.address);
  // });

  // await execute('treasury.setVSwapParams', async () => {
  //   await treasury.setVSwapParams(vSwapRouter, vSwapPair_SHARE_BUSD);
  // });
}

main()
  .then(() => persistResult(results, resultFilePath))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    return persistResult(results, resultFilePath);
  })
  .then(() => {
    process.exit(1);
  });

process.on('SIGTERM', () => {
  console.log('Save result');
  persistResult(results, resultFilePath).then(() => {
    console.log('Bye');
  });
});
