// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Operator.sol";
import "../interfaces/IOracle.sol";

contract BusdOracle is Operator, IOracle {
    using SafeMath for uint256;
    address public chainlinkBnbUsd;
    address public chainlinkBusdBnb;

    uint256 private constant PRICE_PRECISION = 1e6;

    constructor(address _chainlinkBnbUsd, address _chainlinkBusdBnb) public {
        chainlinkBnbUsd = _chainlinkBnbUsd;
        chainlinkBusdBnb = _chainlinkBusdBnb;
    }

    function consult() external view override returns (uint256) {
        return _priceBusdUsd();
    }

    function _priceBusdUsd() private view returns (uint256) {
        uint256 _priceBnbUsd = _getChainlinkPrice(chainlinkBnbUsd);
        uint256 _priceBusdBnb = _getChainlinkPrice(chainlinkBusdBnb);
        return _priceBusdBnb.mul(_priceBnbUsd).div(PRICE_PRECISION);
    }

    function _getChainlinkPrice(address _chainlinkFeedAddress) private view returns (uint256) {
        AggregatorV3Interface _priceFeed = AggregatorV3Interface(_chainlinkFeedAddress);
        (, int256 _price, , , ) = _priceFeed.latestRoundData();
        uint8 _decimals = _priceFeed.decimals();
        return uint256(_price).mul(PRICE_PRECISION).div(uint256(10)**_decimals);
    }

    function setChainlinkBnbUsd(address _chainlinkBnbUsd) external onlyOperator {
        chainlinkBnbUsd = _chainlinkBnbUsd;
    }

    function setChainlinkBusdBnb(address _chainlinkBusdBnb) external onlyOperator {
        chainlinkBusdBnb = _chainlinkBusdBnb;
    }
}
