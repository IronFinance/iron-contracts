// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;
import "hardhat/console.sol";

contract MockPancakeSwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        console.log("MockPancakeSwapRouter.swapExactTokensForTokens");
        console.log("amountIn %s", amountIn);
        console.log("amountOutMin %s", amountOutMin);
        console.log("path %s - %s", path[0], path[1]);
        console.log("to %s", to);
        console.log("deadline %s", deadline);
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[1] = amountOutMin;
    }
}
