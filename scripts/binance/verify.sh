#!/usr/bin/env sh

# verify Timelock
npx hardhat verify --network bsc 0x2D8D8E35BBd23585c55dC81b4EE6069608cd14c5 "0x62cA555de2D65f8e9D45a9B3d5C1b92aC1a64ecc" "43200"

# verify Treasury
npx hardhat verify --network bsc 0xC01c1970E3345EC6Ea4db45E5170a4003756043a 

# verify Dollar
npx hardhat verify --network bsc 0x6eEF3d6eFa10A4390c7673FE20e31937E30fD4cc "IRON Stablecoin" "IRON" "0xC01c1970E3345EC6Ea4db45E5170a4003756043a"

# verify Share
npx hardhat verify --network bsc 0xb1bB4b5bF8a814a25CD702a2a26Ea5477b724980 "IRON Share" "SIL" "0xC01c1970E3345EC6Ea4db45E5170a4003756043a"
