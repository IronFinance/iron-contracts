import {BigNumber} from 'ethers';
import {ethers} from 'hardhat';
import {Numbers} from '../utils/constants';

const main = async () => {
  const [deployer] = await ethers.getSigners();
  const treasury = await ethers.getContract('Treasury');
  const info = await treasury.info();
  console.log('Dollar price', info[0].toString());
  console.log('Share price', info[1].toString());
  console.log('Dollar supply', info[2].toString());
  console.log('effectiveCollateralRatio', info[4].toString());
  console.log('globalCollateralValue', info[5].toString());

  const busd = await ethers.getContract('MockBUSD', deployer);
  const poolBusdAddress = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';
  await busd.transfer(poolBusdAddress, Numbers.ONE_DEC18.mul(10000));

  const poolBusd = await ethers.getContractAt('Pool', poolBusdAddress);
  console.log(
    'poolBusd.availableExcessCollatDV',
    (await poolBusd.availableExcessCollatDV()).toString()
  );

  console.log(
    'Balance of pool',
    (await busd.balanceOf(poolBusdAddress)).toString()
  );
  await treasury.rebalance();
};

main().catch((e) => {
  console.log('Rebalance error', e);
});
