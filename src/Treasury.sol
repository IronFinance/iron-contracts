// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/GSN/Context.sol";

import "./ERC20/ERC20Custom.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IPool.sol";
import "./interfaces/IPancakeSwapRouter.sol";

import "./Operator.sol";

contract Treasury is Operator, ITreasury {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public oracleDollar;
    address public oracleShare;

    address public dollar;
    address public share;

    bool public migrated = false;

    // pools
    address[] public pools_array;
    mapping(address => bool) public pools;

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant RATIO_PRECISION = 1e6;

    // fees
    uint256 public redemption_fee; // 6 decimals of precision
    uint256 public minting_fee; // 6 decimals of precision

    // collateral_ratio
    uint256 public last_refresh_cr_timestamp;
    uint256 public target_collateral_ratio; // 6 decimals of precision
    uint256 public effective_collateral_ratio; // 6 decimals of precision
    uint256 public refresh_cooldown; // Seconds to wait before being able to run refreshCollateralRatio() again
    uint256 public ratio_step; // Amount to change the collateralization ratio by upon refreshCollateralRatio()
    uint256 public price_target; // The price of DOLLAR at which the collateral ratio will respond to; this value is only used for the collateral ratio mechanism and not for minting and redeeming which are hardcoded at $1
    uint256 public price_band; // The bound above and below the price target at which the Collateral ratio is allowed to drop
    bool public collateral_ratio_paused = true; // during bootstraping phase, collateral_ratio will be fixed at 100%
    bool public using_effective_collateral_ratio = false; // toggle the effective collateral ratio usage
    uint256 private constant COLLATERAL_RATIO_MAX = 1e6;

    // rebalance
    address public rebalancing_pool;
    address public rebalancing_pool_collateral;
    uint256 public rebalance_cooldown = 12 hours;
    uint256 public last_rebalance_timestamp;

    // pancake swap
    address public pancake_router = 0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F;
    mapping(address => mapping(address => address[])) private pancake_paths;
    address public busd_address;

    address private busd_pool;
    address private strategist;

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
        require(pools[msg.sender] == true, "Only Pools can call this function");
        _;
    }

    modifier onlyStrategist() {
        require(strategist == msg.sender, "!strategist");
        _;
    }

    modifier notMigrated() {
        require(migrated == false, "migrated");
        _;
    }

    modifier hasRebalancePool() {
        require(rebalancing_pool != address(0), "!rebalancingPool");
        require(rebalancing_pool_collateral != address(0), "!rebalancingPoolCollateral");
        _;
    }

    modifier checkRebalanceCooldown() {
        uint256 _blockTimestamp = block.timestamp;
        require(_blockTimestamp - last_rebalance_timestamp >= rebalance_cooldown, "<rebalance_cooldown");
        _;
        last_rebalance_timestamp = _blockTimestamp;
    }

    /* ========== EVENTS ============= */
    event TransactionExecuted(address indexed target, uint256 value, string signature, bytes data);
    event BoughtBack(uint256 amount);
    event Recollateralized(uint256 amount);

    /* ========== CONSTRUCTOR ========== */

    constructor() public {
        ratio_step = 2500; // = 0.25% at 6 decimals of precision
        target_collateral_ratio = 1000000; // = 100% - fully collateralized at start
        effective_collateral_ratio = 1000000; // = 100% - fully collateralized at start
        refresh_cooldown = 3600; // Refresh cooldown period is set to 1 hour (3600 seconds) at genesis
        price_target = 1000000; // = $1. (6 decimals of precision). Collateral ratio will adjust according to the $1 price target at genesis
        price_band = 5000;
        redemption_fee = 4000;
        minting_fee = 3000;
    }

    /* ========== VIEWS ========== */

    // Returns n DOLLAR = 1 USD
    function dollarPrice() public view returns (uint256) {
        return IOracle(oracleDollar).consult();
    }

    // Returns n SHARE = 1 USD
    function sharePrice() public view returns (uint256) {
        return IOracle(oracleShare).consult();
    }

    function hasPool(address _address) external view override returns (bool) {
        return pools[_address] == true;
    }

    // This is needed to avoid costly repeat calls to different getter functions
    // It is cheaper gas-wise to just dump everything and only use some of the info
    function info()
        external
        view
        override
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (dollarPrice(), sharePrice(), IERC20(dollar).totalSupply(), target_collateral_ratio, effective_collateral_ratio, globalCollateralValue(), minting_fee, redemption_fee);
    }

    // Iterate through all pools and calculate all value of collateral in all pools globally
    function globalCollateralValue() public view returns (uint256) {
        uint256 total_collateral_value = 0;
        for (uint256 i = 0; i < pools_array.length; i++) {
            // Exclude null addresses
            if (pools_array[i] != address(0)) {
                total_collateral_value = total_collateral_value.add(IPool(pools_array[i]).collateralDollarBalance());
            }
        }
        return total_collateral_value;
    }

    function calcEffectiveCollateralRatio() public view returns (uint256) {
        if (!using_effective_collateral_ratio) {
            return target_collateral_ratio;
        }
        uint256 total_collateral_value = globalCollateralValue();
        uint256 total_supply_dollar = IERC20(dollar).totalSupply();
        uint256 ecr = total_collateral_value.mul(PRICE_PRECISION).div(total_supply_dollar);
        if (ecr > COLLATERAL_RATIO_MAX) {
            return COLLATERAL_RATIO_MAX;
        }
        return ecr;
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    function refreshCollateralRatio() public {
        require(collateral_ratio_paused == false, "Collateral Ratio has been paused");
        require(block.timestamp - last_refresh_cr_timestamp >= refresh_cooldown, "Must wait for the refresh cooldown since last refresh");

        uint256 current_dollar_price = dollarPrice();

        // Step increments are 0.25% (upon genesis, changable by setRatioStep())
        if (current_dollar_price > price_target.add(price_band)) {
            // decrease collateral ratio
            if (target_collateral_ratio <= ratio_step) {
                // if within a step of 0, go to 0
                target_collateral_ratio = 0;
            } else {
                target_collateral_ratio = target_collateral_ratio.sub(ratio_step);
            }
        }
        // IRON price is below $1 - `price_band`. Need to increase `collateral_ratio`
        else if (current_dollar_price < price_target.sub(price_band)) {
            // increase collateral ratio
            if (target_collateral_ratio.add(ratio_step) >= COLLATERAL_RATIO_MAX) {
                target_collateral_ratio = COLLATERAL_RATIO_MAX; // cap collateral ratio at 1.000000
            } else {
                target_collateral_ratio = target_collateral_ratio.add(ratio_step);
            }
        }

        if (using_effective_collateral_ratio) {
            effective_collateral_ratio = calcEffectiveCollateralRatio();
        } else {
            effective_collateral_ratio = target_collateral_ratio;
        }

        last_refresh_cr_timestamp = block.timestamp;
    }

    function calcCollateralBalance() public view returns (uint256 _collateral_value, bool _exceeded) {
        uint256 total_collateral_value = globalCollateralValue();
        uint256 target_collateral_value = IERC20(dollar).totalSupply().mul(target_collateral_ratio).div(PRICE_PRECISION);
        if (total_collateral_value >= target_collateral_value) {
            _collateral_value = total_collateral_value.sub(target_collateral_value);
            _exceeded = true;
        } else {
            _collateral_value = target_collateral_value.sub(total_collateral_value);
            _exceeded = false;
        }
    }

    /* -========= INTERNAL FUNCTIONS ============ */

    function _swapToken(
        address input_token,
        address output_token,
        uint256 amount
    ) internal {
        if (amount == 0) return;
        address[] memory path = pancake_paths[input_token][output_token];
        if (path.length == 0) {
            path = new address[](2);
            path[0] = input_token;
            path[1] = output_token;
        }
        IERC20(input_token).safeApprove(pancake_router, 0);
        IERC20(input_token).safeApprove(pancake_router, amount);
        IPancakeSwapRouter(pancake_router).swapExactTokensForTokens(amount, 1, path, address(this), now.add(1800));
    }

    /* ========== RESTRICTED FUNCTIONS ========== */
    // Add new DOLLAR pool. Adds collateral addresses supported, such as tether and busd, must be ERC20
    function addPool(address pool_address) public onlyOperator notMigrated {
        require(pools[pool_address] == false, "poolExisted");
        pools[pool_address] = true;
        pools_array.push(pool_address);
    }

    // Remove a pool
    function removePool(address pool_address) public onlyOperator notMigrated {
        require(pools[pool_address] == true, "!pool");
        // Delete from the mapping
        delete pools[pool_address];
        // 'Delete' from the array by setting the address to 0x0
        for (uint256 i = 0; i < pools_array.length; i++) {
            if (pools_array[i] == pool_address) {
                pools_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }

    // SINGLE POOL STRATEGY
    // With Treasury v1, we will only utilize collateral from a single pool to do rebalancing
    function buyback(uint256 _ultilize_ratio) external onlyStrategist notMigrated hasRebalancePool checkRebalanceCooldown {
        require(_ultilize_ratio > 0 && _ultilize_ratio <= RATIO_PRECISION, ">invalidRatio");
        (uint256 _collateral_value, bool _exceeded) = calcCollateralBalance();
        require(_exceeded && _collateral_value > 0, "!exceeded");
        uint256 _collateral_price = IPool(rebalancing_pool).getCollateralPrice();
        uint256 _collateral_amount_sell = _collateral_value.mul(_ultilize_ratio).div(_collateral_price);
        require(IERC20(rebalancing_pool_collateral).balanceOf(rebalancing_pool) > _collateral_amount_sell, "insufficentPoolBalance");
        IPool(rebalancing_pool).transferCollateralToTreasury(_collateral_amount_sell); // Transfer collateral from pool to treasury
        _swapToken(rebalancing_pool_collateral, share, _collateral_amount_sell);
        emit BoughtBack(_collateral_value);
    }

    // SINGLE POOL STRATEGY
    // With Treasury v1, we will only utilize collateral from a single pool to do rebalancing
    function recollateralize(uint256 _ultilize_ratio) external onlyStrategist notMigrated hasRebalancePool checkRebalanceCooldown {
        require(_ultilize_ratio > 0 && _ultilize_ratio <= RATIO_PRECISION, ">invalidRatio");
        (uint256 _collateral_value, bool _exceeded) = calcCollateralBalance();
        require(!_exceeded && _collateral_value > 0, "exceeded");
        uint256 _share_amount_sell = _collateral_value.mul(_ultilize_ratio).div(sharePrice());
        uint256 _share_balance = IERC20(share).balanceOf(address(this));
        if (_share_balance < _share_amount_sell) {
            _share_amount_sell = _share_balance;
        }
        _swapToken(share, rebalancing_pool_collateral, _share_amount_sell);
        uint256 _collateral_balance = IERC20(rebalancing_pool_collateral).balanceOf(address(this));
        if (_collateral_balance > 0) {
            IERC20(share).safeTransfer(rebalancing_pool, _collateral_balance); // Transfer collateral from Treasury to Pool
        }
        emit Recollateralized(_collateral_value);
    }

    function migrate(address _new_treasury) external onlyOperator notMigrated {
        migrated = true;
        uint256 _share_balance = IERC20(share).balanceOf(address(this));
        if (_share_balance > 0) {
            IERC20(share).safeTransfer(_new_treasury, _share_balance);
        }
        if (rebalancing_pool_collateral != address(0)) {
            uint256 _collateral_balance = IERC20(rebalancing_pool_collateral).balanceOf(address(this));
            if (_collateral_balance > 0) {
                IERC20(rebalancing_pool_collateral).safeTransfer(_new_treasury, _collateral_balance);
            }
        }
    }

    function setRedemptionFee(uint256 _redemption_fee) public onlyOperator {
        redemption_fee = _redemption_fee;
    }

    function setMintingFee(uint256 _minting_fee) public onlyOperator {
        minting_fee = _minting_fee;
    }

    function setRatioStep(uint256 _ratio_step) public onlyOperator {
        ratio_step = _ratio_step;
    }

    function setPriceTarget(uint256 _price_target) public onlyOperator {
        price_target = _price_target;
    }

    function setRefreshCooldown(uint256 _refresh_cooldown) public onlyOperator {
        refresh_cooldown = _refresh_cooldown;
    }

    function setPriceBand(uint256 _price_band) external onlyOperator {
        price_band = _price_band;
    }

    function toggleCollateralRatio() public onlyOperator {
        collateral_ratio_paused = !collateral_ratio_paused;
    }

    function toggleEffectiveCollateralRatio() public onlyOperator {
        using_effective_collateral_ratio = !using_effective_collateral_ratio;
    }

    function setOracleDollar(address _oracleDollar) public onlyOperator {
        oracleDollar = _oracleDollar;
    }

    function setOracleShare(address _oracleShare) public onlyOperator {
        oracleShare = _oracleShare;
    }

    function setDollarAddress(address _dollar) public onlyOperator {
        dollar = _dollar;
    }

    function setShareAddress(address _share) public onlyOperator {
        share = _share;
    }

    function setStrategist(address _strategist) external onlyOperator {
        strategist = _strategist;
    }

    function setPancakeRouter(address _pancake_router) public onlyOperator {
        pancake_router = _pancake_router;
    }

    function setRebalancePool(address _rebalance_pool) public onlyOperator {
        require(pools[_rebalance_pool], "!pool");
        require(IPool(_rebalance_pool).getCollateralToken() != address(0), "!poolCollateralToken");
        rebalancing_pool = _rebalance_pool;
        rebalancing_pool_collateral = IPool(_rebalance_pool).getCollateralToken();
    }

    function setRebalanceCooldown(uint256 _rebalance_cooldown) public onlyOperator {
        rebalance_cooldown = _rebalance_cooldown;
    }

    function setPancakeRouterPath(
        address _input,
        address _output,
        address[] memory _path
    ) external onlyOperator {
        pancake_paths[_input][_output] = _path;
    }

    /* ========== EMERGENCY ========== */

    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data
    ) public onlyOperator returns (bytes memory) {
        bytes memory callData;

        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, string("Treasury::executeTransaction: Transaction execution reverted."));
        emit TransactionExecuted(target, value, signature, data);
        return returnData;
    }

    receive() external payable {}
}
