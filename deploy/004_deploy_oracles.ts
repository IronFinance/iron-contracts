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
  const oracle_SHARE_BUSD = await deploy('PairOracle_SHARE_BUSD', {
    contract: MockPairOracle,
    args: [4100392],
    from: creator,
    log: true,
  });

  setContractAddress('oracle_DOLLAR_BUSD', oracle_DOLLAR_BUSD.address);
  setContractAddress('oracle_SHARE_BUSD', oracle_SHARE_BUSD.address);

  console.log(chalk.yellow('===== LINK ORACLES ====='));

  const MockChainlinkAggregator = await deployments.getArtifact(
    'MockChainlinkAggregator'
  );
  const mockPriceFeed_BNB_USD = await deploy(
    'MockChainlinkAggregator_BNB_USD',
    {
      contract: MockChainlinkAggregator,
      args: ['30000000000', 8],
      from: creator,
      log: true,
    }
  );
  const mockPriceFeed_BUSD_BNB = await deploy(
    'MockChainlinkAggregator_BNB_USD',
    {
      contract: MockChainlinkAggregator,
      args: ['333323', 8],
      from: creator,
      log: true,
    }
  );

  const oracleBusd = await deploy('BusdOracle', {
    args: [mockPriceFeed_BNB_USD.address, mockPriceFeed_BUSD_BNB.address],
    from: creator,
    log: true,
  });

  const oracleDollar = await deploy('DollarOracle', {
    args: [addresses.dollar, oracle_DOLLAR_BUSD.address, oracleBusd.address],
    from: creator,
    log: true,
  });

  const oracleShare = await deploy('ShareOracle', {
    args: [addresses.share, oracle_SHARE_BUSD.address, oracleBusd.address],
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
