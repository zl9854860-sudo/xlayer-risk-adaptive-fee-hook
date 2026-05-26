// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "../types/PoolKey.sol";

interface IPoolManagerMinimal {
    function updateDynamicLPFee(PoolKey memory key, uint24 newDynamicLPFee) external;
}
