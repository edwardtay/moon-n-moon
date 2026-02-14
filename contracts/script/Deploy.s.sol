// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {CrashGame} from "../src/CrashGame.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address agentAddress = vm.envAddress("AGENT_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        CrashGame game = new CrashGame(agentAddress);
        console.log("CrashGame deployed to:", address(game));
        console.log("Operator:", game.operator());
        console.log("Agent:", game.agentAddress());

        vm.stopBroadcast();
    }
}
