// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library LPFeeLibrary {
    error LPFeeTooLarge(uint24 fee);

    uint24 internal constant DYNAMIC_FEE_FLAG = 0x800000;
    uint24 internal constant OVERRIDE_FEE_FLAG = 0x400000;
    uint24 internal constant MAX_LP_FEE = 1_000_000;

    function isDynamicFee(uint24 self) internal pure returns (bool) {
        return self == DYNAMIC_FEE_FLAG;
    }

    function validate(uint24 self) internal pure {
        if (self > MAX_LP_FEE) revert LPFeeTooLarge(self);
    }
}
