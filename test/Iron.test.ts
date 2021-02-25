import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {solidity, deployMockContract} from 'ethereum-waffle';
import {Contract, ContractFactory, BigNumber, utils} from 'ethers';
import {SignerWithAddress} from 'hardhat-deploy-ethers/dist/src/signer-with-address';
import ChainlinkETHUSDPriceConsumer from '../artifacts/src/oracle/chainlink/ChainlinkPairOracle_USD_ETH.sol/ChainlinkPairOracle_USD_ETH.json';

chai.use(solidity);

describe('Tokens', () => {
  const ETH = utils.parseEther('1');
  const ZERO = BigNumber.from(0);
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  let creator: SignerWithAddress;
  let timelock: SignerWithAddress;
  let pool: SignerWithAddress;
  let miner: SignerWithAddress;
  let anyone: SignerWithAddress;
  let pool_2: SignerWithAddress;
  let new_owner: SignerWithAddress;
  let anyone_2: SignerWithAddress;

  before('setup accounts', async () => {
    [
      creator,
      timelock,
      pool,
      pool_2,
      miner,
      anyone,
      new_owner,
      anyone_2,
    ] = await ethers.getSigners();
  });

  let Iron: ContractFactory;

  before('fetch contract factories', async () => {
    Iron = await ethers.getContractFactory('Iron');
  });

  describe('Iron', () => {
    let token: Contract;
    let mockChainLinkEthToUserPricer: Contract;

    before('deploy token', async () => {
      token = await Iron.connect(creator).deploy(
        'Iron Dollar',
        'IRON',
        creator.address,
        timelock.address
      );
      token.connect(creator).addPool(pool.address);
      mockChainLinkEthToUserPricer = await deployMockContract(
        creator,
        ChainlinkETHUSDPriceConsumer.abi
      );
    });

    it('adds then removes another pool', async () => {
      await token.addPool(pool_2.address);
      expect(await token.iron_pools(pool_2.address)).to.be.true;
      expect(await token.iron_pools_array(1)).to.eq(pool_2.address);

      await token.removePool(pool_2.address);
      expect(await token.iron_pools(pool_2.address)).to.be.false;
      expect(await token.iron_pools_array(1)).to.not.eq(pool_2.address);
    });

    it('allows only owner or timelock or controller to add pool', async () => {
      await expect(
        token.connect(anyone).addPool(pool_2.address)
      ).to.be.revertedWith(
        'You are not the owner, controller, or the governance timelock'
      );
      await expect(token.connect(timelock).addPool(pool_2.address)).to.not.be
        .reverted;
    });

    it('allows only owner or timelock or controller to remove pool', async () => {
      await expect(
        token.connect(anyone).removePool(pool_2.address)
      ).to.be.revertedWith(
        'You are not the owner, controller, or the governance timelock'
      );
      await expect(token.connect(timelock).removePool(pool_2.address)).to.not.be
        .reverted;
    });

    it('will throw if not mint by a pool', async () => {
      const mintAmount = ETH.mul(3);
      await expect(
        token.connect(anyone).pool_mint(miner.address, mintAmount)
      ).to.be.revertedWith('Only IRON pools can call this function');
    });

    it('mint eth by pool', async () => {
      const mintAmount = ETH.mul(3);
      await expect(token.connect(pool).pool_mint(miner.address, mintAmount))
        .to.emit(token, 'IRON_Minted')
        .withArgs(pool.address, miner.address, mintAmount)
        .to.emit(token, 'Transfer')
        .withArgs(ZERO_ADDR, miner.address, mintAmount);
      expect(await token.balanceOf(miner.address)).to.eq(mintAmount);
    });

    it('burns token by its owner', async () => {
      await expect(token.connect(miner).burn(ETH))
        .to.emit(token, 'Transfer')
        .withArgs(miner.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(miner.address)).to.eq(ETH.mul(2));
    });

    it('burns token by creator', async () => {
      await expect(token.connect(miner).approve(creator.address, ETH));
      await expect(token.connect(creator).burnFrom(miner.address, ETH))
        .to.emit(token, 'Transfer')
        .withArgs(miner.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(miner.address)).to.eq(ETH);
    });

    it('burns token by pool', async () => {
      await expect(token.connect(miner).approve(pool.address, ETH));
      await expect(token.connect(pool).pool_burn_from(miner.address, ETH))
        .to.emit(token, 'IRON_Burned')
        .withArgs(miner.address, pool.address, ETH)
        .to.emit(token, 'Transfer')
        .withArgs(miner.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(miner.address)).to.eq(ZERO);
    });

    it('sets new redemption fee', async () => {
      await token.setRedemptionFee(ETH.mul(2));
      expect(await token.redemption_fee()).to.eq(ETH.mul(2));
    });

    it('sets new minting fee', async () => {
      await token.setMintingFee(ETH.mul(3));
      expect(await token.minting_fee()).to.eq(ETH.mul(3));
    });

    it('sets new ratio step', async () => {
      await token.setRatioStep(3500); // 0.35% - 6 decimats
      expect(await token.ratio_step()).to.eq(3500);
    });

    it('sets new price target', async () => {
      await token.setPriceTarget(ETH.mul(2));
      expect(await token.price_target()).to.eq(ETH.mul(2));
    });

    it('sets new refresh cooldown', async () => {
      await token.setRefreshCooldown(3 * 60 * 60);
      expect(await token.refresh_cooldown()).to.eq(3 * 60 * 60);
    });

    it('sets new address for SILVER', async () => {
      await token.setSilverAddress(anyone.address);
      expect(await token.silver_address()).to.eq(anyone.address);
    });

    it('sets new address for ETH-to-USD Oracle', async () => {
      await mockChainLinkEthToUserPricer.mock.getDecimals.returns(18);
      await token.setEthToUsdOracle(mockChainLinkEthToUserPricer.address);
      expect(await token.eth_usd_oracle_address()).to.eq(
        mockChainLinkEthToUserPricer.address
      );
    });

    it('sets new address for CONTROLLER', async () => {
      await token.setController(anyone.address);
      expect(await token.controller_address()).to.eq(anyone.address);
    });

    it('sets new address for IRON-to-ETH Oracle', async () => {
      await token.setIronToEthOracle(anyone.address, ZERO_ADDR);
      expect(await token.iron_eth_oracle_address()).to.eq(anyone.address);
    });

    it('sets new address for SILVER-to-ETH Oracle', async () => {
      await token.setSilverToEthOracle(anyone.address, ZERO_ADDR);
      expect(await token.silver_eth_oracle_address()).to.eq(anyone.address);
    });

    it('sets new price band', async () => {
      await token.setPriceBand(500000);
      expect(await token.price_band()).to.eq(500000);
    });

    it('sets new owner by current owner', async () => {
      await token.connect(timelock).setOwner(new_owner.address);
      expect(await token.owner_address()).to.eq(new_owner.address);
      await token.connect(timelock).setOwner(creator.address);
    });

    it('sets new address for Timelock', async () => {
      await token.setTimelock(anyone.address);
      expect(await token.timelock_address()).to.eq(anyone.address);
    });

    it('allows only owner or timelock to do restricted operations', async () => {
      await token.setTimelock(timelock.address);
      await expect(token.connect(anyone_2).setOwner(creator.address)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setRedemptionFee(ETH.mul(10))).to.be
        .reverted;
      await expect(token.connect(anyone_2).setMintingFee(ETH.mul(10))).to.be
        .reverted;
      await expect(token.connect(anyone_2).setRatioStep(3500)).to.be.reverted;
      await expect(token.connect(anyone_2).setPriceTarget(2)).to.be.reverted;
      await expect(token.connect(anyone_2).setRefreshCooldown(7200000)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setSilverAddress(ZERO_ADDR)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setEthToUsdOracle(ZERO_ADDR)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setTimelock(ZERO_ADDR)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setController(ZERO_ADDR)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setPriceBand(500000)).to.be.reverted;
      await expect(token.connect(anyone_2).setIronToEthOracle(ZERO_ADDR)).to.be
        .reverted;
      await expect(token.connect(anyone_2).setSilverToEthOracle(ZERO_ADDR)).to
        .be.reverted;
    });
  });
});
