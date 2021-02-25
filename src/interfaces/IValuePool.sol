// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

interface IValuePool {
    function getSpotPriceSansFee(address tokenIn, address tokenOut) external view returns (uint spotPrice);
}
