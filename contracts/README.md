# MomCare AI Smart Contracts

This folder contains the Solidity smart contracts used by the MomCare AI platform, deployed on the **Monad Testnet**.

---

## 📄 Files

-   [`StackTheBox.sol`](contracts/StackTheBox.sol):
    The smart contract for the "Stack the Box" game leaderboard. It manages player scores, maintains a sorted leaderboard, and emits events for frontend updates.
-   [`MomCareMilestoneNFT.sol`](contracts/MomCareMilestoneNFT.sol):
    A gas-optimized ERC721 contract for minting non-transferable "Milestone Badges" to users for achieving specific milestones within the MomCare AI application. Metadata is generated on-chain.

---

## 📝 Overview

### StackTheBox.sol

-   **Purpose:** Enable on-chain, verifiable high scores for the MomCare AI stacking game. Players submit their scores, and the contract maintains a public leaderboard of the top `MAX_LEADERBOARD_SIZE` scores.
-   **Network:** Deployed on the **Monad Testnet**.
-   **Frontend Integration:** Used by the game page ([`src/pages/GamesPage.tsx`](src/pages/GamesPage.tsx)) via Ethers.js for submitting scores (`submitScore`) and fetching the leaderboard (`getLeaderboard`).

### MomCareMilestoneNFT.sol

-   **Purpose:** Allow users to mint unique, non-transferable NFT badges representing achievements (milestones) within the MomCare AI app. This provides a verifiable and engaging way to track user progress.
-   **Features:**
    -   ERC721 compliant (with metadata).
    -   **Non-transferable:** Badges cannot be transferred between users.
    -   **Ownable & Pausable:** Contract owner can manage milestone types and pause minting.
    -   **Gas Optimized:** Uses Milestone Type IDs instead of storing full names per token.
    -   **On-Chain Metadata:** `tokenURI` function generates JSON metadata directly on-chain.
-   **Network:** Deployed on the **Monad Testnet**.
-   **Frontend Integration:** Used by the milestones page ([`src/pages/MonadPage.tsx`](src/pages/MonadPage.tsx)) via Ethers.js for checking eligibility (off-chain logic), minting badges (`mintMilestoneBadge`), fetching user badges (`getUserOwnedTokens`), and displaying metadata (`tokenURI`). *(Note: Frontend interaction is currently mocked as per the notice on the page)*.

---

## ⚙️ Usage

### 1. Compile

Use a [Solidity](https://soliditylang.org/) compiler (v0.8.20+ recommended for `MomCareMilestoneNFT`, v0.8.29+ for `StackTheBox`):

```sh
# Example using solc for StackTheBox
solc --optimize --bin --abi contracts/StackTheBox.sol -o build/
# Example using solc for MomCareMilestoneNFT
solc --optimize --via-ir --bin --abi contracts/MomCareMilestoneNFT.sol -o build/ --base-path . --include-path node_modules/
```

Alternatively, use tools like [Hardhat](https://hardhat.org/), [Foundry](https://book.getfoundry.sh/), or the [Remix IDE](https://remix.ethereum.org/) for compilation, testing, and deployment. Ensure OpenZeppelin contracts (`@openzeppelin/contracts`) are installed if using local tools for `MomCareMilestoneNFT.sol`.

### 2. Deploy

Deploy the compiled contracts to the **Monad Testnet** using your preferred deployment tool (Remix, Hardhat, Foundry, scripts with Ethers.js, etc.).

-   For `MomCareMilestoneNFT`, the deployer address will become the initial owner.
-   Record the deployed contract addresses.

### 3. Configure Frontend

Update the contract addresses in the relevant frontend files:

-   `StackTheBox` address in [`src/pages/GamesPage.tsx`](src/pages/GamesPage.tsx).
-   `MomCareMilestoneNFT` address in [`src/pages/MonadPage.tsx`](src/pages/MonadPage.tsx) (replace `YOUR_DEPLOYED_CONTRACT_ADDRESS_ON_MONAD`).
-   Ensure the ABI in [`src/pages/MonadPage.tsx`](src/pages/MonadPage.tsx) matches the compiled `MomCareMilestoneNFT` ABI.

### 4. Interact

**StackTheBox:**

-   **Submit Score:** Players call `submitScore(uint256 score)` via the game UI.
-   **Get Leaderboard:** Frontend calls `getLeaderboard()` to display scores.
-   **Events:** Frontend can listen for `NewHighScore` and `LeaderboardUpdated` events.

**MomCareMilestoneNFT:**

-   **(Owner) Add Milestone Type:** Owner calls `addMilestoneType(string memory _name)` to define achievable milestones.
-   **(User) Mint Badge:** Users call `mintMilestoneBadge(uint256 _milestoneTypeId)` via the milestones UI after meeting off-chain criteria.
-   **(Frontend) Get User Badges:** Frontend calls `getUserOwnedTokens(address _user)` to list badges owned by a user.
-   **(Frontend) Get Badge Info:** Frontend calls `getMilestoneInfo(uint256 _tokenId)` to get type ID and mint date.
-   **(Frontend/Marketplace) Get Metadata:** Call `tokenURI(uint256 _tokenId)` to retrieve on-chain metadata for display.
-   **Events:** Listen for `MilestoneTypeAdded` and `MilestoneMinted`.

---

## 🔒 Security Notes

**StackTheBox:**

-   Scores are submitted by `msg.sender`. Ensure game logic prevents score cheating before submission.
-   Leaderboard data is public on-chain.
-   `MAX_LEADERBOARD_SIZE` limits gas costs for updates.

**MomCareMilestoneNFT:**

-   **Non-Transferable:** Enforced by overriding `_update`.
-   **Ownership:** Critical functions (`addMilestoneType`, `pause`, `unpause`, `setBaseURI`) are `onlyOwner`. Secure the owner key.
-   **Pausable:** Minting can be paused by the owner in emergencies.
-   **Milestone Types:** Only the owner can add new milestone types. Ensure names are appropriate.
-   **Duplicate Minting:** Contract prevents a user from minting the same milestone type more than once.

**General:**

-   Test contracts thoroughly on a testnet before considering mainnet deployment.
-   Audit contracts for security vulnerabilities if deploying with real value or sensitive logic.

---

## 📎 References

-   [`StackTheBox.sol`](contracts/StackTheBox.sol)
-   [`MomCareMilestoneNFT.sol`](contracts/MomCareMilestoneNFT.sol)
-   [Game Frontend Integration (`src/pages/GamesPage.tsx`)](../src/pages/GamesPage.tsx)
-   [Milestone Frontend Integration (`src/pages/MonadPage.tsx`)](../src/pages/MonadPage.tsx)
-   [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x/)
-   [Monad Documentation](https://docs.monad.xyz/)

---