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
    address public oracleShareBnb;
    address public chainlinkBnbUsd;
    address public share;

    uint256 private constant PRICE_PRECISION = 1e6;

    constructor(
        address _share,
        address _oracleShareBnb,
        address _chainlinkBnbUsd
    ) public {
        share = _share;
        chainlinkBnbUsd = _chainlinkBnbUsd;
        oracleShareBnb = _oracleShareBnb;
    }

    function consult() external view override returns (uint256) {
        uint256 _priceBnbUsd = priceBnbUsd();
        uint256 _priceShareBnb = IPairOracle(oracleShareBnb).consult(share, PRICE_PRECISION);
        return _priceBnbUsd.mul(_priceShareBnb).div(PRICE_PRECISION);
    }

    function priceBnbUsd() internal view returns (uint256) {
        AggregatorV3Interface _priceFeed = AggregatorV3Interface(chainlinkBnbUsd);
        (, int256 _price, , , ) = _priceFeed.latestRoundData();
        uint8 _decimals = _priceFeed.decimals();
        return uint256(_price).mul(PRICE_PRECISION).div(uint256(10)**_decimals);
    }

    function setChainlinkBnbUsd(address _chainlinkBnbUsd) external onlyOperator {
        chainlinkBnbUsd = _chainlinkBnbUsd;
    }

    function setOracleShareBnb(address _oracleShareBnb) external onlyOperator {
        oracleShareBnb = _oracleShareBnb;
    }
}
