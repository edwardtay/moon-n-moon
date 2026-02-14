// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract CrashGame {
    // --- Types ---
    enum RoundStatus { None, Betting, Active, Crashed, Resolved }

    struct Bet {
        uint256 amount;
        uint256 cashOutMultiplier; // 0 = didn't cash out (lost)
        bool claimed;
    }

    struct Round {
        bytes32 commitHash;
        uint256 crashMultiplier; // scaled by 100 (e.g. 250 = 2.50x)
        uint256 startTime;
        uint256 lockTime; // when betting closes & multiplier starts
        uint256 endTime;
        RoundStatus status;
        address[] players;
        uint256 totalBets;
        uint256 totalPayouts;
    }

    // --- State ---
    address public operator;
    address public agentAddress;
    uint256 public currentRoundId;
    uint256 public constant MIN_BET = 0.0001 ether;
    uint256 public constant MAX_BET = 10 ether;
    uint256 public constant BETTING_DURATION = 15 seconds;

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Bet)) public bets;

    // Leaderboard
    mapping(address => int256) public playerProfit;
    mapping(address => uint256) public totalWagered;
    mapping(address => uint256) public roundsPlayed;

    // --- Events ---
    event RoundStarted(uint256 indexed roundId, bytes32 commitHash, uint256 startTime);
    event BetPlaced(uint256 indexed roundId, address indexed player, uint256 amount);
    event CashOut(uint256 indexed roundId, address indexed player, uint256 multiplier);
    event RoundEnded(uint256 indexed roundId, uint256 crashMultiplier);
    event WinningsClaimed(uint256 indexed roundId, address indexed player, uint256 payout);

    // --- Modifiers ---
    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor(address _agentAddress) {
        operator = msg.sender;
        agentAddress = _agentAddress;
    }

    // --- Core Functions ---

    function startRound(bytes32 commitHash) external onlyOperator {
        // If there's a previous round, it must be resolved
        if (currentRoundId > 0) {
            require(
                rounds[currentRoundId].status == RoundStatus.Resolved,
                "Previous round not resolved"
            );
        }

        currentRoundId++;
        Round storage r = rounds[currentRoundId];
        r.commitHash = commitHash;
        r.startTime = block.timestamp;
        r.lockTime = block.timestamp + BETTING_DURATION;
        r.status = RoundStatus.Betting;

        emit RoundStarted(currentRoundId, commitHash, block.timestamp);
    }

    function placeBet() external payable {
        Round storage r = rounds[currentRoundId];
        require(r.status == RoundStatus.Betting, "Not in betting phase");
        require(block.timestamp < r.lockTime, "Betting closed");
        require(msg.value >= MIN_BET, "Below min bet");
        require(msg.value <= MAX_BET, "Above max bet");
        require(bets[currentRoundId][msg.sender].amount == 0, "Already bet");

        bets[currentRoundId][msg.sender] = Bet({
            amount: msg.value,
            cashOutMultiplier: 0,
            claimed: false
        });

        r.players.push(msg.sender);
        r.totalBets += msg.value;

        totalWagered[msg.sender] += msg.value;
        roundsPlayed[msg.sender]++;

        emit BetPlaced(currentRoundId, msg.sender, msg.value);
    }

    function lockRound() external onlyOperator {
        Round storage r = rounds[currentRoundId];
        require(r.status == RoundStatus.Betting, "Not in betting phase");
        r.status = RoundStatus.Active;
        r.lockTime = block.timestamp;
    }

    function recordCashOut(address player, uint256 multiplier) external onlyOperator {
        Round storage r = rounds[currentRoundId];
        require(r.status == RoundStatus.Active, "Round not active");
        require(multiplier >= 100, "Multiplier must be >= 1.00x");

        Bet storage b = bets[currentRoundId][player];
        require(b.amount > 0, "No bet found");
        require(b.cashOutMultiplier == 0, "Already cashed out");

        b.cashOutMultiplier = multiplier;

        emit CashOut(currentRoundId, player, multiplier);
    }

    function endRound(uint256 crashMultiplier, bytes32 salt) external onlyOperator {
        Round storage r = rounds[currentRoundId];
        require(
            r.status == RoundStatus.Active || r.status == RoundStatus.Betting,
            "Round not active"
        );

        // Verify commit-reveal
        bytes32 computed = keccak256(abi.encodePacked(crashMultiplier, salt));
        require(computed == r.commitHash, "Invalid reveal");
        require(crashMultiplier >= 100, "Crash must be >= 1.00x");

        r.crashMultiplier = crashMultiplier;
        r.endTime = block.timestamp;
        r.status = RoundStatus.Crashed;

        emit RoundEnded(currentRoundId, crashMultiplier);

        // Auto-resolve: calculate payouts
        _resolveRound(currentRoundId);
    }

    function _resolveRound(uint256 roundId) internal {
        Round storage r = rounds[roundId];

        for (uint256 i = 0; i < r.players.length; i++) {
            address player = r.players[i];
            Bet storage b = bets[roundId][player];

            if (b.cashOutMultiplier > 0 && b.cashOutMultiplier <= r.crashMultiplier) {
                // Winner: cashed out before crash
                uint256 payout = (b.amount * b.cashOutMultiplier) / 100;
                r.totalPayouts += payout;
                playerProfit[player] += int256(payout) - int256(b.amount);
            } else {
                // Loser: didn't cash out or cashed out after crash (shouldn't happen)
                playerProfit[player] -= int256(b.amount);
            }
        }

        r.status = RoundStatus.Resolved;
    }

    function claimWinnings(uint256 roundId) external {
        Round storage r = rounds[roundId];
        require(r.status == RoundStatus.Resolved, "Round not resolved");

        Bet storage b = bets[roundId][msg.sender];
        require(b.amount > 0, "No bet");
        require(!b.claimed, "Already claimed");
        require(b.cashOutMultiplier > 0, "Didn't cash out");
        require(b.cashOutMultiplier <= r.crashMultiplier, "Cashed out after crash");

        b.claimed = true;
        uint256 payout = (b.amount * b.cashOutMultiplier) / 100;

        (bool success,) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(roundId, msg.sender, payout);
    }

    // --- View Functions ---

    function getRoundInfo(uint256 roundId)
        external
        view
        returns (
            bytes32 commitHash,
            uint256 crashMultiplier,
            uint256 startTime,
            uint256 lockTime,
            uint256 endTime,
            RoundStatus status,
            uint256 totalBets,
            uint256 totalPayouts,
            uint256 playerCount
        )
    {
        Round storage r = rounds[roundId];
        return (
            r.commitHash,
            r.crashMultiplier,
            r.startTime,
            r.lockTime,
            r.endTime,
            r.status,
            r.totalBets,
            r.totalPayouts,
            r.players.length
        );
    }

    function getBet(uint256 roundId, address player)
        external
        view
        returns (uint256 amount, uint256 cashOutMultiplier, bool claimed)
    {
        Bet storage b = bets[roundId][player];
        return (b.amount, b.cashOutMultiplier, b.claimed);
    }

    function getPlayerStats(address player)
        external
        view
        returns (int256 profit, uint256 wagered, uint256 rounds_)
    {
        return (playerProfit[player], totalWagered[player], roundsPlayed[player]);
    }

    function getRoundPlayers(uint256 roundId) external view returns (address[] memory) {
        return rounds[roundId].players;
    }

    // --- Admin ---

    function setOperator(address newOperator) external onlyOperator {
        operator = newOperator;
    }

    function setAgentAddress(address _agentAddress) external onlyOperator {
        agentAddress = _agentAddress;
    }

    /// @notice Operator can deposit house funds
    receive() external payable {}

    /// @notice Emergency withdraw (operator only)
    function emergencyWithdraw() external onlyOperator {
        (bool success,) = operator.call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
