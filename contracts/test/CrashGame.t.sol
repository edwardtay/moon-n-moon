// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {CrashGame} from "../src/CrashGame.sol";

contract CrashGameTest is Test {
    CrashGame public game;
    address public operator;
    address public agent;
    address public player1;
    address public player2;

    function setUp() public {
        operator = address(this);
        agent = makeAddr("agent");
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");

        game = new CrashGame(agent);

        // Fund players
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(agent, 100 ether);
        // Fund contract (house balance)
        vm.deal(address(game), 1000 ether);
    }

    function _commitHash(uint256 crashMultiplier, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(crashMultiplier, salt));
    }

    function test_StartRound() public {
        bytes32 salt = bytes32(uint256(1));
        uint256 crash = 250; // 2.50x
        bytes32 commit = _commitHash(crash, salt);

        game.startRound(commit);

        assertEq(game.currentRoundId(), 1);
        (bytes32 ch,,uint256 st,,, CrashGame.RoundStatus status,,,) = game.getRoundInfo(1);
        assertEq(ch, commit);
        assertEq(st, block.timestamp);
        assertEq(uint8(status), uint8(CrashGame.RoundStatus.Betting));
    }

    function test_PlaceBet() public {
        bytes32 salt = bytes32(uint256(1));
        bytes32 commit = _commitHash(250, salt);
        game.startRound(commit);

        vm.prank(player1);
        game.placeBet{value: 0.1 ether}();

        (uint256 amount, uint256 cashOut, bool claimed) = game.getBet(1, player1);
        assertEq(amount, 0.1 ether);
        assertEq(cashOut, 0);
        assertFalse(claimed);
    }

    function test_FullRound_PlayerWins() public {
        bytes32 salt = bytes32(uint256(42));
        uint256 crash = 300; // 3.00x
        bytes32 commit = _commitHash(crash, salt);

        // Start round
        game.startRound(commit);

        // Player bets 1 BNB
        vm.prank(player1);
        game.placeBet{value: 1 ether}();

        // Lock betting
        vm.warp(block.timestamp + 16);
        game.lockRound();

        // Player cashes out at 2.00x
        game.recordCashOut(player1, 200);

        // End round - crash at 3.00x
        game.endRound(crash, salt);

        // Player claims: 1 BNB * 2.00 = 2 BNB
        uint256 balBefore = player1.balance;
        vm.prank(player1);
        game.claimWinnings(1);
        uint256 balAfter = player1.balance;

        assertEq(balAfter - balBefore, 2 ether);
    }

    function test_FullRound_PlayerLoses() public {
        bytes32 salt = bytes32(uint256(42));
        uint256 crash = 150; // 1.50x
        bytes32 commit = _commitHash(crash, salt);

        game.startRound(commit);

        vm.prank(player1);
        game.placeBet{value: 1 ether}();

        vm.warp(block.timestamp + 16);
        game.lockRound();

        // Player doesn't cash out
        game.endRound(crash, salt);

        // Player can't claim
        vm.prank(player1);
        vm.expectRevert("Didn't cash out");
        game.claimWinnings(1);
    }

    function test_FullRound_CashOutAfterCrash() public {
        bytes32 salt = bytes32(uint256(42));
        uint256 crash = 150; // 1.50x
        bytes32 commit = _commitHash(crash, salt);

        game.startRound(commit);

        vm.prank(player1);
        game.placeBet{value: 1 ether}();

        vm.warp(block.timestamp + 16);
        game.lockRound();

        // Player cashes out at 2.00x but crash is at 1.50x
        game.recordCashOut(player1, 200);

        game.endRound(crash, salt);

        // Can't claim because cashout > crash
        vm.prank(player1);
        vm.expectRevert("Cashed out after crash");
        game.claimWinnings(1);
    }

    function test_InvalidReveal() public {
        bytes32 salt = bytes32(uint256(42));
        bytes32 commit = _commitHash(300, salt);

        game.startRound(commit);
        vm.warp(block.timestamp + 16);
        game.lockRound();

        // Try to reveal with wrong crash value
        vm.expectRevert("Invalid reveal");
        game.endRound(200, salt);
    }

    function test_MultiplePlayers() public {
        bytes32 salt = bytes32(uint256(99));
        uint256 crash = 250; // 2.50x
        bytes32 commit = _commitHash(crash, salt);

        game.startRound(commit);

        vm.prank(player1);
        game.placeBet{value: 1 ether}();

        vm.prank(player2);
        game.placeBet{value: 2 ether}();

        vm.warp(block.timestamp + 16);
        game.lockRound();

        // Player1 cashes out at 1.50x, player2 at 2.00x
        game.recordCashOut(player1, 150);
        game.recordCashOut(player2, 200);

        game.endRound(crash, salt);

        // Player1: 1 * 1.5 = 1.5 BNB
        uint256 bal1Before = player1.balance;
        vm.prank(player1);
        game.claimWinnings(1);
        assertEq(player1.balance - bal1Before, 1.5 ether);

        // Player2: 2 * 2.0 = 4 BNB
        uint256 bal2Before = player2.balance;
        vm.prank(player2);
        game.claimWinnings(1);
        assertEq(player2.balance - bal2Before, 4 ether);
    }

    function test_ConsecutiveRounds() public {
        // Round 1
        bytes32 salt1 = bytes32(uint256(1));
        game.startRound(_commitHash(200, salt1));
        vm.warp(block.timestamp + 16);
        game.lockRound();
        game.endRound(200, salt1);

        // Round 2
        bytes32 salt2 = bytes32(uint256(2));
        game.startRound(_commitHash(300, salt2));
        assertEq(game.currentRoundId(), 2);
        vm.warp(block.timestamp + 16);
        game.lockRound();
        game.endRound(300, salt2);
    }

    function test_MinMaxBet() public {
        bytes32 salt = bytes32(uint256(1));
        game.startRound(_commitHash(200, salt));

        // Below min
        vm.prank(player1);
        vm.expectRevert("Below min bet");
        game.placeBet{value: 0.0001 ether}();

        // Above max
        vm.prank(player1);
        vm.expectRevert("Above max bet");
        game.placeBet{value: 11 ether}();
    }

    function test_PlayerStats() public {
        bytes32 salt = bytes32(uint256(42));
        uint256 crash = 300;
        game.startRound(_commitHash(crash, salt));

        vm.prank(player1);
        game.placeBet{value: 1 ether}();

        vm.warp(block.timestamp + 16);
        game.lockRound();
        game.recordCashOut(player1, 200);
        game.endRound(crash, salt);

        (int256 profit, uint256 wagered, uint256 rounds_) = game.getPlayerStats(player1);
        assertEq(profit, 1 ether); // won 2 BNB on 1 BNB bet = +1 profit
        assertEq(wagered, 1 ether);
        assertEq(rounds_, 1);
    }
}
