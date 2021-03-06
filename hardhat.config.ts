import 'dotenv/config';
import {HardhatRuntimeEnvironment, HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-gas-reporter';
import 'hardhat-spdx-license-identifier';
import 'hardhat-contract-sizer';
import '@nomiclabs/hardhat-etherscan';
import {node_url, accounts, etherscanApiKey} from './utils/network';
import {task} from 'hardhat/config';
import {Numbers} from './utils/constants';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.6.11',
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    creator: 0,
    devFund: 1,
    pool_creator: 0,
    timelock_admin: 0,
    governor_guardian_address: 0,
    dummy: 7,
    test_deployer: 3,
  },
  networks: {
    hardhat: {
      accounts: accounts(),
    },
    localhost: {
      url: 'http://localhost:8545',
      accounts: accounts(),
    },
    mainnet: {
      url: node_url('mainnet'),
      accounts: accounts('mainnet'),
    },
    kovan: {
      url: node_url('kovan'),
      accounts: accounts('kovan'),
    },
    bsc: {
      url: node_url('bsc'),
      accounts: accounts('bsc'),
      chainId: 56,
    },
    bsctest: {
      url: node_url('bsctest'),
      accounts: accounts('bsctest'),
      chainId: 97,
    },
  },
  etherscan: {
    apiKey: etherscanApiKey(),
  },
  paths: {
    sources: 'src',
  },
  mocha: {
    timeout: 0,
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
};
export default config;

task('initAccountBalance', "Init dev account's balance")
  .addParam('account', 'Account address to transfer to')
  .setAction(
    async (args: {account: string}, hre: HardhatRuntimeEnvironment) => {
      const {ethers} = hre;
      const user = args.account;
      const [deployer] = await ethers.getSigners();
      console.log('Account balance:', (await deployer.getBalance()).toString());
      const share = await ethers.getContract('Share', deployer);
      // const dollar = await ethers.getContract('Dollar', deployer);
      const busd = await ethers.getContract('MockBUSD', deployer);

      await share.transfer(user, Numbers.ONE_DEC18.mul(125));
      // await dollar.transfer(user, Numbers.ONE_DEC18.mul(2000));
      await busd.transfer(user, Numbers.ONE_DEC18.mul(334000));
      await deployer.sendTransaction({
        to: user,
        value: Numbers.ONE_DEC18.mul(334),
      });
    }
  );
