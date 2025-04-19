# MomCare AI Smart Contracts

This folder contains the Solidity smart contracts used by the MomCare AI platform, primarily for the blockchain-based stacking game and leaderboard integration on the Monad Testnet.

---

## 📄 Files

- [`StackTheBox.sol`](StackTheBox.sol):  
  The main smart contract for the "Stack the Box" game. It manages player scores, maintains a leaderboard, and emits events for frontend updates.

---

## 📝 Overview

- **Purpose:**  
  Enable on-chain, verifiable high scores for the MomCare AI stacking game. Players can submit their scores, and the contract maintains a public leaderboard.

- **Network:**  
  Deployed on the **Monad Testnet**.

- **Frontend Integration:**  
  The contract is used by the frontend game page ([`src/pages/GamesPage.tsx`](../src/pages/GamesPage.tsx)) via Ethers.js for submitting and fetching scores.

---

## ⚙️ Usage

### 1. Compile

Use [Solidity](https://soliditylang.org/) compiler (v0.8.x recommended):

```sh
solc --optimize --bin --abi StackTheBox.sol -o build/
```

Or use [Remix IDE](https://remix.ethereum.org/) for quick testing and deployment.

### 2. Deploy

Deploy to Monad Testnet using your preferred tool (Remix, Hardhat, Foundry, etc.).  
Set the contract address in the frontend ([`CONTRACT_ADDRESS` in `src/pages/GamesPage.tsx`](../src/pages/GamesPage.tsx)).

### 3. Interact

- **Submit Score:**  
  Players call `submitScore(uint256 score)` to record a new score.
- **Get Leaderboard:**  
  Use `getLeaderboard()` to fetch the top scores.
- **Events:**  
  Listen for `LeaderboardUpdated` events for real-time updates.

---

## 🔒 Security Notes

- Only valid scores are accepted (see contract logic).
- All leaderboard data is public on-chain.
- Test thoroughly before deploying to mainnet.

---

## 📎 References

- [StackTheBox.sol](StackTheBox.sol)
- [Game Frontend Integration](../src/pages/GamesPage.tsx)
- [Monad Testnet](https://monad.xyz/)

---