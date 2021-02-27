import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import chalk from 'chalk';
import {setContractAddresses} from '../utils/address';
import ERC20 from '@openzeppelin/contracts/build/contracts/ERC20.json';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
  const {deployer, creator, devFund, timelock_admin} = await getNamedAccounts();

  console.log(chalk.yellowBright('001 :: Deploying main contracts'));
  await deploy('Timelock', {
    from: creator,
    args: [timelock_admin, 12 * 60 * 60], // 6 minutes
    log: true,
  });
  const timelock = await deployments.get('Timelock');

  const treasury = await deploy('Treasury', {
    from: creator,
    log: true,
    args: [],
  });

  const dollar = await deploy('Dollar', {
    from: deployer,
    args: ['IRON Stablecoin', 'IRON', treasury.address],
    log: true,
  });

  const share = await deploy('Share', {
    from: deployer,
    args: ['SIL - IRON Bank Share', 'SIL', treasury.address],
    log: true,
  });

  await execute(
    'Treasury',
    {from: creator, log: true},
    'setDollarAddress',
    dollar.address
  );

  await execute(
    'Treasury',
    {from: creator, log: true},
    'setShareAddress',
    share.address
  );

  await execute('Dollar', {from: creator, log: true}, 'initialize');

  const startTime = Math.floor(
    new Date('2021-02-25T09:00:00.000+00:00').getTime() / 1000
  );
  await execute(
    'Share',
    {from: creator, log: true},
    'initialize',
    devFund,
    creator,
    startTime
  );

  setContractAddresses({
    dollar: dollar.address,
    share: share.address,
    timelock: timelock.address,
    treasury: treasury.address,
  });

  await deploy('ERC20', {
    contract: ERC20,
    args: ['', ''],
    from: creator,
    log: true,
  });
};
export default func;
