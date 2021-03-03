import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import chalk from 'chalk';
import {setContractAddresses} from '../utils/address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {creator} = await getNamedAccounts();

  console.log(chalk.yellow('===== LINK COLLATERAL ADDRESSES ====='));
  console.log(chalk.yellow('DETECT LOCAL ENV: MOCK COLLATERAL ====='));
  const MockCollateral = await deployments.getArtifact('MockCollateral');
  const busd = await deploy('MockBUSD', {
    contract: MockCollateral,
    from: creator,
    args: [creator, 'BUSD', 18],
    log: true,
  });
  const wbnb = await deploy('MockWBNB', {
    contract: MockCollateral,
    from: creator,
    args: [creator, 'BUSD', 18],
    log: true,
  });
  setContractAddresses({
    busd: busd.address,
    wbnb: wbnb.address,
  });
};
export default func;
