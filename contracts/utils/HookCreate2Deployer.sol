// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract HookCreate2Deployer {
    event Deployed(address indexed deployed, bytes32 indexed salt);

    error EmptyBytecode();
    error DeployFailed();

    function deploy(bytes32 salt, bytes memory bytecode) external payable returns (address deployed) {
        if (bytecode.length == 0) revert EmptyBytecode();
        assembly ("memory-safe") {
            deployed := create2(callvalue(), add(bytecode, 0x20), mload(bytecode), salt)
        }
        if (deployed == address(0)) revert DeployFailed();
        emit Deployed(deployed, salt);
    }

    function computeAddress(bytes32 salt, bytes32 bytecodeHash) external view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash)))));
    }
}
