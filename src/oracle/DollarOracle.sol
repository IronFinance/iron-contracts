// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Operator.sol";
import "../interfaces/IOracle.sol";
import "../interfaces/IPairOracle.sol";

contract DollarOracle is Operator, IOracle {
    using SafeMath for uint256;
    address public oracleDollarBusd;
    address public oracleBusdUsd;
    address public dollar;

    uint256 private constant PRICE_PRECISION = 1e6;

    constructor(
        address _dollar,
        address _oracleDollarBusd,
        address _oracleBusdUsd
    ) public {
        dollar = _dollar;
        oracleBusdUsd = _oracleBusdUsd;
        oracleDollarBusd = _oracleDollarBusd;
    }

    function consult() external view override returns (uint256) {
        uint256 _priceBusdUsd = IOracle(oracleBusdUsd).consult();
        uint256 _priceDollarBusd = IPairOracle(oracleDollarBusd).consult(dollar, PRICE_PRECISION);
        return _priceBusdUsd.mul(_priceDollarBusd).div(PRICE_PRECISION);
    }

    function setOracleBusdUsd(address _oracleBusdUsd) external onlyOperator {
        oracleBusdUsd = _oracleBusdUsd;
    }

    function setOracleDollarBusd(address _oracleDollarBusd) external onlyOperator {
        oracleDollarBusd = _oracleDollarBusd;
    }
}
