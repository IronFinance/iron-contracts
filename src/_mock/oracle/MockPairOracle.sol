// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../interfaces/IPairOracle.sol";
import "../../Operator.sol";

contract MockPairOracle is IPairOracle, Operator {
    using SafeMath for uint256;

    uint256 public mockPrice;
    uint256 constant PRICE_PRECISION = 1e6;
    uint256 public PERIOD = 3600; // 1 hour TWAP (time-weighted average price)

    constructor(uint256 _mockPrice) public {
        mockPrice = _mockPrice;
    }

    function consult(address token, uint256 amountIn) external view override returns (uint256 amountOut) {
        return mockPrice.mul(amountIn).div(PRICE_PRECISION);
    }

    function update() external override {}

    function setPeriod(uint256 _period) external onlyOperator {
        PERIOD = _period;
    }

    function mock(uint256 _mockPrice) external {
        mockPrice = _mockPrice;
    }
}
