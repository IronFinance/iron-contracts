/* eslint-disable prefer-const */
import {ethers} from 'hardhat';
import {Numbers} from '../utils/constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Account balance:', (await deployer.getBalance()).toString());
  const share = await ethers.getContract('Share', deployer);
  // const dollar = await ethers.getContract('Dollar', deployer);
  const busd = await ethers.getContract('MockBUSD', deployer);
  // await share.transfer(user, Numbers.ONE_DEC18.mul(125));
  // // await dollar.transfer(user, Numbers.ONE_DEC18.mul(2000));
  // await busd.transfer(user, Numbers.ONE_DEC18.mul(334000));
  // await deployer.sendTransaction({to: user, value: Numbers.ONE_DEC18.mul(334)});
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
