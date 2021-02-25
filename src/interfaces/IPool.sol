// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

interface IPool {
    function collateralDollarBalance() external view returns (uint256);

    function migrate(address _new_pool) external;

    function transferCollateralToTreasury(uint256 amount) external;

    function getCollateralPrice() external view returns (uint256);

    function getCollateralToken() external view returns (address);
}
