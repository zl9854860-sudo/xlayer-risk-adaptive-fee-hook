// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

type BalanceDelta is int256;

library BalanceDeltaLibrary {
    BalanceDelta public constant ZERO_DELTA = BalanceDelta.wrap(0);

    function amount0(BalanceDelta balanceDelta) internal pure returns (int128 value) {
        assembly ("memory-safe") {
            value := sar(128, balanceDelta)
        }
    }

    function amount1(BalanceDelta balanceDelta) internal pure returns (int128 value) {
        assembly ("memory-safe") {
            value := signextend(15, balanceDelta)
        }
    }
}
