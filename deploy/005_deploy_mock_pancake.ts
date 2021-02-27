import chalk from 'chalk';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {addresses} from '../utils/address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(chalk.yellow('005: Deploy Mock pancake swap'));
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
  const {creator} = await getNamedAccounts();
  // const MockPancakeSwapRouter = await deployments.getArtifact(
  //   'MockPancakeSwapRouter'
  // );
  // const mockPancakeSwapRouter = await deploy('MockPancakeSwapRouter', {
  //   contract: MockPancakeSwapRouter,
  //   args: [],
  //   from: creator,
  //   log: true,
  // });

  // console.log(mockPancakeSwapRouter.address);

  // await execute(
  //   'Treasury',
  //   {
  //     from: creator,
  //   },
  //   'setPancakeRouter',
  //   mockPancakeSwapRouter.address
  // );

  // await execute(
  //   'Treasury',
  //   {
  //     from: creator,
  //   },
  //   'setRebalancePool',
  //   addresses.poolBUSD
  // );
};

export default func;
