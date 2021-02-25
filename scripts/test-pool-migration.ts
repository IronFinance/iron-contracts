/* eslint-disable prefer-const */
import chalk from 'chalk';
import {ethers} from 'hardhat';
import {Numbers} from '../utils/constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Account balance:', (await deployer.getBalance()).toString());
  const dollar = await ethers.getContract('Dollar');
  const share = await ethers.getContract('Share');
  const busd = await ethers.getContract('MockBUSD', deployer);
  const treasury = await ethers.getContract('Treasury', deployer);
  const Pool = await ethers.getContractFactory('Pool');
  const contract = await Pool.deploy(
    dollar.address,
    share.address,
    busd.address,
    treasury.address,
    Numbers.ONE_HUNDRED_MILLION_DEC18.mul(5)
  );
  const poolBUSD_new = await contract.deployed();

  console.log(chalk.yellow('Adding pools to Treasury'));
  await treasury.addPool(poolBUSD_new.address);

  console.log(chalk.yellow('Migrate from old pool to new pool'));
  const poolBUSD_old = await ethers.getContractAt(
    'Pool',
    '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
    deployer
  );
  await poolBUSD_old.migrate(poolBUSD_new);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
