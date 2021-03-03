import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import chalk from 'chalk';
import {getContractAddress} from '../utils/address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, ethers} = hre;
  const {creator} = await getNamedAccounts();

  console.log(chalk('999 == FINALIZATION'));

  console.log(
    chalk.yellow('===== TEMPORARILY SET THE PERIOD TO 1 SECOND =====')
  );

  const oracle_DOLLAR_BUSD = await ethers.getContractAt(
    'VSwapPairOracle',
    getContractAddress('oracle_DOLLAR_BUSD'),
    creator
  );
  const oracle_SHARE_BNB = await ethers.getContractAt(
    'VSwapPairOracle',
    getContractAddress('oracle_SHARE_BNB'),
    creator
  );
  await oracle_DOLLAR_BUSD.setPeriod(1);
  await oracle_SHARE_BNB.setPeriod(1);

  await oracle_DOLLAR_BUSD.update();
  await oracle_SHARE_BNB.update();
};
export default func;
