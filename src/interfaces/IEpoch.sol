// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

interface IEpoch {
    function epoch() external view returns (uint256);

    function nextEpochPoint() external view returns (uint256);
}
