import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import chalk from 'chalk';
import {Numbers} from '../utils/constants';
import {setContractAddresses} from '../utils/address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {creator} = await getNamedAccounts();

  console.log(chalk.yellow('===== LINK COLLATERAL ADDRESSES ====='));
  console.log(chalk.yellow('DETECT LOCAL ENV: MOCK COLLATERAL ====='));
  const MockCollateral = await deployments.getArtifact('MockCollateral');
  const wbnb = await deploy('MockWBNB', {
    contract: MockCollateral,
    from: creator,
    args: [creator, Numbers.ONE_HUNDRED_MILLION_DEC18, 'WBNB', 18],
    log: true,
  });
  const busd = await deploy('MockBUSD', {
    contract: MockCollateral,
    from: creator,
    args: [creator, Numbers.ONE_HUNDRED_MILLION_DEC18, 'BUSD', 18],
    log: true,
  });
  setContractAddresses({
    wbnb: wbnb.address,
    busd: busd.address,
  });
};
export default func;
