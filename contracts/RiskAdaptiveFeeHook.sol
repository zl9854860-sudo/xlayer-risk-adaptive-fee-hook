// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseOverrideFee} from "./v4/base/BaseOverrideFee.sol";
import {PoolId, PoolIdLibrary} from "./v4/types/PoolId.sol";
import {PoolKey} from "./v4/types/PoolKey.sol";
import {SwapParams} from "./v4/types/PoolOperation.sol";

contract RiskAdaptiveFeeHook is BaseOverrideFee {
    using PoolIdLibrary for PoolKey;

    uint16 public constant MAX_RISK_BPS = 10_000;
    uint24 public constant MAX_LP_FEE = 1_000_000;

    struct FeeConfig {
        uint24 calmFee;
        uint24 alertFee;
        uint24 maxFee;
    }

    struct RiskSnapshot {
        uint16 riskBps;
        uint16 volatilityBps;
        uint16 socialSpikeBps;
        uint40 updatedAt;
    }

    address public owner;
    address public riskUpdater;
    FeeConfig public feeConfig;
    mapping(PoolId => RiskSnapshot) public riskSnapshots;
    mapping(PoolId => bytes32) public riskLabels;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RiskUpdaterChanged(address indexed previousUpdater, address indexed newUpdater);
    event FeeConfigChanged(uint24 calmFee, uint24 alertFee, uint24 maxFee);
    event PoolRiskUpdated(
        PoolId indexed poolId,
        uint16 riskBps,
        uint16 volatilityBps,
        uint16 socialSpikeBps,
        bytes32 label,
        uint40 updatedAt
    );

    error Unauthorized();
    error InvalidOwner();
    error InvalidFeeConfig();
    error InvalidRiskScore();

    constructor(address poolManager_, address owner_, address riskUpdater_) BaseOverrideFee(poolManager_) {
        if (owner_ == address(0)) revert InvalidOwner();
        owner = owner_;
        riskUpdater = riskUpdater_;
        feeConfig = FeeConfig({calmFee: 500, alertFee: 3_000, maxFee: 10_000});
        emit OwnershipTransferred(address(0), owner_);
        emit RiskUpdaterChanged(address(0), riskUpdater_);
        emit FeeConfigChanged(500, 3_000, 10_000);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRiskUpdater() {
        if (msg.sender != owner && msg.sender != riskUpdater) revert Unauthorized();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setRiskUpdater(address newRiskUpdater) external onlyOwner {
        emit RiskUpdaterChanged(riskUpdater, newRiskUpdater);
        riskUpdater = newRiskUpdater;
    }

    function setFeeConfig(uint24 calmFee, uint24 alertFee, uint24 maxFee) external onlyOwner {
        if (calmFee > alertFee || alertFee > maxFee || maxFee > MAX_LP_FEE) revert InvalidFeeConfig();
        feeConfig = FeeConfig({calmFee: calmFee, alertFee: alertFee, maxFee: maxFee});
        emit FeeConfigChanged(calmFee, alertFee, maxFee);
    }

    function setPoolRisk(
        PoolKey calldata key,
        uint16 riskBps,
        uint16 volatilityBps,
        uint16 socialSpikeBps,
        bytes32 label
    ) external onlyRiskUpdater {
        if (riskBps > MAX_RISK_BPS || volatilityBps > MAX_RISK_BPS || socialSpikeBps > MAX_RISK_BPS) {
            revert InvalidRiskScore();
        }

        PoolId poolId = key.toId();
        uint40 updatedAt = uint40(block.timestamp);
        riskSnapshots[poolId] = RiskSnapshot({
            riskBps: riskBps,
            volatilityBps: volatilityBps,
            socialSpikeBps: socialSpikeBps,
            updatedAt: updatedAt
        });
        riskLabels[poolId] = label;

        emit PoolRiskUpdated(poolId, riskBps, volatilityBps, socialSpikeBps, label, updatedAt);
    }

    function quoteFee(PoolKey calldata key) external view returns (uint24) {
        return _feeForRisk(riskSnapshots[key.toId()].riskBps);
    }

    function hookPermissionMask() external pure returns (uint160) {
        return AFTER_INITIALIZE_FLAG | BEFORE_SWAP_FLAG;
    }

    function _getFee(address, PoolKey calldata key, SwapParams calldata, bytes calldata)
        internal
        view
        override
        returns (uint24)
    {
        return _feeForRisk(riskSnapshots[key.toId()].riskBps);
    }

    function _feeForRisk(uint16 riskBps) internal view returns (uint24) {
        FeeConfig memory config = feeConfig;

        if (riskBps < 2_500) return config.calmFee;
        if (riskBps < 6_000) {
            return _interpolate(config.calmFee, config.alertFee, riskBps - 2_500, 3_500);
        }
        return _interpolate(config.alertFee, config.maxFee, riskBps - 6_000, 4_000);
    }

    function _interpolate(uint24 fromFee, uint24 toFee, uint16 offset, uint16 width) private pure returns (uint24) {
        return fromFee + uint24((uint256(toFee - fromFee) * offset) / width);
    }
}
