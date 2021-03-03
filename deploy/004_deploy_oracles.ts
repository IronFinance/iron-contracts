import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import chalk from 'chalk';
import {addresses, setContractAddress} from '../utils/address';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
  const {creator} = await getNamedAccounts();

  console.log(chalk.yellow('004 :: Deploying Oracle contracts'));

  console.log(chalk.yellow('=== Mock Value Oracle =========='));
  const MockPairOracle = await deployments.getArtifact('MockPairOracle');
  const oracle_DOLLAR_BUSD = await deploy('PairOracle_DOLLAR_BUSD', {
    contract: MockPairOracle,
    args: [998999],
    from: creator,
    log: true,
  });
  const oracle_SHARE_BNB = await deploy('PairOracle_SHARE_BNB', {
    contract: MockPairOracle,
    args: [20000],
    from: creator,
    log: true,
  });

  setContractAddress('oracle_DOLLAR_BUSD', oracle_DOLLAR_BUSD.address);
  setContractAddress('oracle_SHARE_BNB', oracle_SHARE_BNB.address);

  console.log(chalk.yellow('===== LINK ORACLES ====='));

  const MockChainlinkAggregator = await deployments.getArtifact(
    'MockChainlinkAggregator'
  );
  const mockPriceFeed_BUSD_USD = await deploy(
    'MockChainlinkAggregator_BUSD_USD',
    {
      contract: MockChainlinkAggregator,
      args: ['100498532', 8],
      from: creator,
      log: true,
    }
  );
  const mockPriceFeed_BNB_USD = await deploy(
    'MockChainlinkAggregator_BNB_USD',
    {
      contract: MockChainlinkAggregator,
      args: ['25124633000', 8],
      from: creator,
      log: true,
    }
  );

  const oracleBusd = await deploy('BusdOracle', {
    args: [mockPriceFeed_BUSD_USD.address],
    from: creator,
    log: true,
  });

  const oracleDollar = await deploy('DollarOracle', {
    args: [addresses.dollar, oracle_DOLLAR_BUSD.address, oracleBusd.address],
    from: creator,
    log: true,
  });

  const oracleShare = await deploy('ShareOracle', {
    args: [
      addresses.share,
      oracle_SHARE_BNB.address,
      mockPriceFeed_BNB_USD.address,
    ],
    from: creator,
    log: true,
  });

  await execute(
    'PoolBUSD',
    {from: creator, log: true},
    'setOracle',
    oracleBusd.address
  );

  await execute(
    'Treasury',
    {from: creator, log: true},
    'setOracleDollar',
    oracleDollar.address
  );

  await execute(
    'Treasury',
    {from: creator, log: true},
    'setOracleShare',
    oracleShare.address
  );
};
export default func;
