// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Operator.sol";
import "../interfaces/IOracle.sol";
import "../interfaces/IPairOracle.sol";

contract ShareOracle is Operator, IOracle {
    using SafeMath for uint256;
    address public oracleShareBusd;
    address public oracleBusdUsd;
    address public share;

    uint256 private constant PRICE_PRECISION = 1e6;

    constructor(
        address _share,
        address _oracleShareBusd,
        address _oracleBusdUsd
    ) public {
        share = _share;
        oracleBusdUsd = _oracleBusdUsd;
        oracleShareBusd = _oracleShareBusd;
    }

    function consult() external view override returns (uint256) {
        uint256 _priceBusdUsd = IOracle(oracleBusdUsd).consult();
        uint256 _priceShareBnb = IPairOracle(oracleShareBusd).consult(share, PRICE_PRECISION);
        return _priceBusdUsd.mul(_priceShareBnb).div(PRICE_PRECISION);
    }

    function setOracleBusdUsd(address _oracleBusdUsd) external onlyOperator {
        oracleBusdUsd = _oracleBusdUsd;
    }

    function setOracleShareBusd(address _oracleShareBusd) external onlyOperator {
        oracleShareBusd = _oracleShareBusd;
    }
}
