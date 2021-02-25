import {BigNumber} from 'ethers';

export const KnownContracts = {
  mainnet: {
    DAI: '',
    WETH: '',
    USDC: '',
    USDT: '',
    UniswapRouter: '',
    Chainlink: {
      DAI_ETH: '',
      USDC_ETH: '',
      USDT_ETH: '',
      ETH_USD: '',
    },
  },
  kovan: {
    DAI: '',
    WETH: '',
    USDC: '',
    USDT: '',
    UniswapRouter: '',
    Chainlink: {
      DAI_ETH: '0x22B58f1EbEDfCA50feF632bD73368b2FdA96D541',
      USDC_ETH: '0x64EaC61A2DFda2c3Fa04eED49AA33D021AeC8838',
      USDT_ETH: '0x0bF499444525a23E7Bb61997539725cA2e928138',
      ETH_USD: '0x9326BFA02ADD2366b30bacB125260Af641031331',
    },
  },
};

export const Numbers = {
  ONE_DEC18: BigNumber.from('1000000000000000000'),
  ONE_DEC6: BigNumber.from('1000000'),
  ONE_HUNDRED_MILLION_DEC18: BigNumber.from('100000000000000000000000000'),
  ONE_MILLION_DEC18: BigNumber.from('1000000000000000000000000'),
  FIVE_MILLION_DEC18: BigNumber.from('5000000000000000000000000'),
  FIVE_HUNDRED_THOUDSAND_DEC18: BigNumber.from('500000000000000000000000'),
  TWO_HUNDRED_THOUDSAND_DEC18: BigNumber.from('200000000000000000000000'),
};

export const Constants = {
  TIMELOCK_DELAY: 172800, // 2 days
  DUMMY_ADDRESS: '0x6666666666666666666666666666666666666666',
  REDEMPTION_FEE: 4000, // 0.4%
  MINTING_FEE: 3000, // 0.3%
};
