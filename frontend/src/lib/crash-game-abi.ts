export const crashGameAbi = [
  // --- Operator functions ---
  {
    type: "function",
    name: "startRound",
    inputs: [{ name: "commitHash", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "lockRound",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recordCashOut",
    inputs: [
      { name: "player", type: "address" },
      { name: "multiplier", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "endRound",
    inputs: [
      { name: "crashMultiplier", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // --- Player functions ---
  {
    type: "function",
    name: "placeBet",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claimWinnings",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBet",
    inputs: [
      { name: "roundId", type: "uint256" },
      { name: "player", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "cashOutMultiplier", type: "uint256" },
      { name: "claimed", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPlayerStats",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "profit", type: "int256" },
      { name: "wagered", type: "uint256" },
      { name: "rounds_", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentRoundId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundInfo",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "commitHash", type: "bytes32" },
      { name: "crashMultiplier", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "lockTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "totalBets", type: "uint256" },
      { name: "totalPayouts", type: "uint256" },
      { name: "playerCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agentAddress",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "BetPlaced",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CashOut",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "multiplier", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RoundEnded",
    inputs: [
      { name: "roundId", type: "uint256", indexed: true },
      { name: "crashMultiplier", type: "uint256", indexed: false },
    ],
  },
] as const;
