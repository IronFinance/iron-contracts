// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

interface IShareDevFund {
    function claimDevFundRewards(uint256 _amount) external;

    function unclaimedDevFund() external view returns (uint256 _pending);

    function setDevFund(address _devFund) external;
}
