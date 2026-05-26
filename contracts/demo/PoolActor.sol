// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "../v4/types/PoolKey.sol";
import {Currency} from "../v4/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "../v4/types/BalanceDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "../v4/types/PoolOperation.sol";

interface IERC20TransferFrom {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IPoolManagerActor {
    function unlock(bytes calldata data) external returns (bytes memory);

    function modifyLiquidity(PoolKey memory key, ModifyLiquidityParams memory params, bytes calldata hookData)
        external
        returns (BalanceDelta callerDelta, BalanceDelta feesAccrued);

    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData)
        external
        returns (BalanceDelta swapDelta);

    function sync(Currency currency) external;

    function take(Currency currency, address to, uint256 amount) external;

    function settle() external payable returns (uint256 paid);
}

contract PoolActor {
    using BalanceDeltaLibrary for BalanceDelta;

    enum Action {
        AddLiquidityAndSwap
    }

    IPoolManagerActor public immutable poolManager;

    event LiquidityAdded(int128 amount0, int128 amount1);
    event SwapExecuted(int128 amount0, int128 amount1);

    error NotPoolManager();
    error TokenPaymentFailed(address token, uint256 amount);

    constructor(address poolManager_) {
        poolManager = IPoolManagerActor(poolManager_);
    }

    function addLiquidityAndSwap(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external returns (bytes memory result) {
        bytes memory data = abi.encode(
            Action.AddLiquidityAndSwap,
            msg.sender,
            key,
            tickLower,
            tickUpper,
            liquidityDelta,
            zeroForOne,
            amountSpecified,
            sqrtPriceLimitX96
        );
        return poolManager.unlock(data);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();

        (
            Action action,
            address payer,
            PoolKey memory key,
            int24 tickLower,
            int24 tickUpper,
            int256 liquidityDelta,
            bool zeroForOne,
            int256 amountSpecified,
            uint160 sqrtPriceLimitX96
        ) = abi.decode(data, (Action, address, PoolKey, int24, int24, int256, bool, int256, uint160));

        if (action == Action.AddLiquidityAndSwap) {
            ModifyLiquidityParams memory liquidityParams =
                ModifyLiquidityParams({tickLower: tickLower, tickUpper: tickUpper, liquidityDelta: liquidityDelta, salt: 0});
            (BalanceDelta liquidityDeltaResult,) = poolManager.modifyLiquidity(key, liquidityParams, "");
            _settleOrTake(key, liquidityDeltaResult, payer);
            emit LiquidityAdded(liquidityDeltaResult.amount0(), liquidityDeltaResult.amount1());

            SwapParams memory swapParams = SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amountSpecified,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            });
            BalanceDelta swapDelta = poolManager.swap(key, swapParams, "");
            _settleOrTake(key, swapDelta, payer);
            emit SwapExecuted(swapDelta.amount0(), swapDelta.amount1());
        }

        return "";
    }

    function _settleOrTake(PoolKey memory key, BalanceDelta delta, address payer) private {
        _settleOrTakeCurrency(key.currency0, delta.amount0(), payer);
        _settleOrTakeCurrency(key.currency1, delta.amount1(), payer);
    }

    function _settleOrTakeCurrency(Currency currency, int128 delta, address payer) private {
        if (delta < 0) {
            uint256 amount = uint256(uint128(-delta));
            poolManager.sync(currency);
            address token = Currency.unwrap(currency);
            bool ok = IERC20TransferFrom(token).transferFrom(payer, address(poolManager), amount);
            if (!ok) revert TokenPaymentFailed(token, amount);
            poolManager.settle();
        } else if (delta > 0) {
            poolManager.take(currency, payer, uint256(uint128(delta)));
        }
    }
}
