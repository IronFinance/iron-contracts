import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import chalk from 'chalk';
import {Numbers} from '../utils/constants';
import {addresses, setContractAddress} from '../utils/address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
  const {creator} = await getNamedAccounts();

  console.log(chalk.yellow('003 :: Deploying Pools'));

  const Pool = await deployments.getArtifact('Pool');
  const poolBUSD = await deploy('PoolBUSD', {
    contract: Pool,
    from: creator,
    log: true,
    args: [
      addresses.dollar,
      addresses.share,
      addresses.busd,
      addresses.treasury,
      Numbers.ONE_HUNDRED_MILLION_DEC18,
    ],
  });

  setContractAddress('poolBUSD', poolBUSD.address);

  console.log(chalk.yellow('Adding pools to Treasury'));
  await execute(
    'Treasury',
    {from: creator, log: true},
    'addPool',
    poolBUSD.address
  );
};
export default func;
func.tags = [];
