import {expect} from './chai-setup';

import IPool from '../artifacts/src/interfaces/IPool.sol/IPool.json';
import IOracle from '../artifacts/src/interfaces/IOracle.sol/IOracle.json';
import IPancakeSwapRouter from '../artifacts/src/interfaces/IPancakeSwapRouter.sol/IPancakeSwapRouter.json';
import IERC20 from '../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json';
import {ethers} from 'hardhat';
import {SignerWithAddress} from 'hardhat-deploy-ethers/dist/src/signer-with-address';
import {deployMockContract, MockContract} from 'ethereum-waffle';
import {BigNumber, Contract} from 'ethers';
import {Numbers} from '../utils/constants';

describe('Treasury', () => {
  let deployer: SignerWithAddress;
  let strategist: SignerWithAddress;
  let alice: SignerWithAddress;
  let mockPoolBusd: MockContract;
  let mockDollar: MockContract;
  let mockBusd: MockContract;
  let mockPancakeRouter: MockContract;
  let sut: Contract;

  before(async () => {
    [deployer, strategist, alice] = await ethers.getSigners();
    mockPoolBusd = await deployMockContract(deployer, IPool.abi);
    mockDollar = await deployMockContract(deployer, IERC20.abi);
    mockBusd = await deployMockContract(deployer, IERC20.abi);
    mockPancakeRouter = await deployMockContract(
      deployer,
      IPancakeSwapRouter.abi
    );
  });

  beforeEach(async () => {
    const factory = await ethers.getContractFactory('Treasury');
    sut = await factory.connect(deployer).deploy();
    await sut.setDollarAddress(mockDollar.address);
    await sut.addPool(mockPoolBusd.address);
    await sut.setBusdPool(mockPoolBusd.address);
    await sut.setBusd(mockBusd.address);
    await sut.setPancakeRouter(mockPancakeRouter.address);
    await sut.setStrategist(strategist.address);
  });

  it('should rebalance', async () => {
    await mockDollar.mock.totalSupply.returns(Numbers.ONE_DEC18.mul(1e6)); // 1M
    await mockPoolBusd.mock.collateralDollarBalance.returns(
      Numbers.ONE_DEC18.mul(16e5)
    ); // 1.6M
    await mockPoolBusd.mock.getCollateralPrice.returns(1200000); // 1.2$

    // tcr = 1, P(busd) = 1.2$, exceed collat = 0.6M => amount(busd) = 250000
    // verify
    await mockPoolBusd.mock.transferCollateralToTreasury
      .withArgs(Numbers.ONE_DEC18.mul(250000))
      .returns();
    await mockPancakeRouter.mock.swapExactTokensForTokens.returns([
      Numbers.ONE_DEC18.mul(1000),
    ]);
    await mockBusd.mock.balanceOf
      .withArgs(mockPoolBusd.address)
      .returns(Numbers.ONE_DEC18.mul(300000));

    await mockBusd.mock.allowance.returns(BigNumber.from(0));
    await mockBusd.mock.approve.returns(true);

    await expect(sut.connect(alice).rebalance()).to.revertedWith('!strategist');

    await expect(sut.connect(strategist).rebalance()).to.not.reverted;
  });
});
