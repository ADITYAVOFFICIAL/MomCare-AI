# MomCare AI Smart Contracts

This repository contains the Solidity smart contracts powering key features of the MomCare AI platform, specifically designed for deployment on the **Monad Testnet**. These contracts handle on-chain game leaderboards and non-fungible token (NFT) based milestone achievements.

---

## 📄 Contracts

*   [`MomCareMilestoneNFT.sol`](contracts/MomCareMilestoneNFT.sol):
    An enhanced and gas-optimized ERC721 contract for issuing **non-transferable** "Milestone Badges". These NFTs represent user achievements within the MomCare AI application, providing verifiable proof of progress. It features dynamic on-chain metadata generation, milestone type management, level tracking, and batch minting capabilities.
*   [`StackTheBox.sol`](contracts/StackTheBox.sol):
    A smart contract implementing a leaderboard for the "Stack the Box" game integrated into MomCare AI. It efficiently tracks individual player high scores and maintains a globally ranked, fixed-size leaderboard of the top performers.

---

## 📝 Detailed Overview

### `MomCareMilestoneNFT.sol` - Milestone Badges

*   **Purpose:** To create a system for rewarding users with unique, non-transferable NFT badges for reaching specific milestones (e.g., daily usage streaks, completing modules) within the MomCare AI platform. This fosters engagement and provides users with tangible, verifiable records of their achievements on the blockchain.
*   **Standard:** ERC721 (Non-Fungible Token Standard) with Metadata extension.
*   **Network:** Deployed on the **Monad Testnet**.
*   **Key Features:**
    *   **Non-Transferable:** Badges are soulbound; they cannot be sold or transferred between users, enforced via the `_update` hook override.
    *   **Ownable:** Contract management (adding types, pausing, setting URIs) is restricted to the deployer/owner address.
    *   **Pausable:** Minting operations can be temporarily halted by the owner in case of emergencies or maintenance.
    *   **Milestone Types:** The owner can define different categories of milestones (e.g., "7-Day Streak", "Profile Complete") using `addMilestoneType`. Each type has a unique ID, name, and can be enabled/disabled for minting.
    *   **Milestone Levels:** Each minted badge is associated with a specific achievement `level`. The contract prevents users from minting the same or a lower level for a milestone type they've already achieved (`_userMilestoneLevel` tracking).
    *   **Batch Minting:** Allows the owner (e.g., a backend service) to efficiently mint badges for multiple users in a single transaction (`batchMintMilestones`).
    *   **Explicit Burn:** Users can choose to permanently destroy (burn) their own badges using the `burn` function.
    *   **On-Chain Metadata:** The `tokenURI` function dynamically generates JSON metadata for each badge directly on-chain, including name, description, attributes (Milestone Name, Type ID, Level, Mint Date), and potentially an image URI.
    *   **Optional External Image URI:** The owner can set a specific image URL (e.g., IPFS, HTTPS) for each token ID using `setTokenImageURI`. This overrides the default image handling in `tokenURI`.
    *   **Optional Base URI:** The owner can set a `_baseTokenURI`. If set, `tokenURI` will return `_baseTokenURI` + `tokenId`, allowing for off-chain metadata hosting patterns.
    *   **User Token Enumeration:** Provides `getUserOwnedTokens` to easily retrieve all badge IDs owned by a specific user address.
    *   **Gas Optimizations:** Uses counters, type IDs, and efficient state management. Includes notes on potential further optimization by moving metadata off-chain.
    *   **Events:** Emits detailed events for milestone type changes (`MilestoneTypeAdded`, `MilestoneTypeUpdated`, `MilestoneTypeEnabled`), image URI setting (`TokenImageURISet`), and badge minting (`MilestoneMinted`). Standard `Transfer` events are emitted for mints and burns.
*   **Frontend Integration:** Intended for use with the milestones page ([`src/pages/MonadPage.tsx`](src/pages/MonadPage.tsx)). The frontend would typically:
    1.  Check off-chain conditions to determine if a user is eligible for a milestone.
    2.  Call `mintMilestoneBadge(typeId, level)` to allow the user to claim their badge.
    3.  Call `getUserOwnedTokens(userAddress)` to display the user's collected badges.
    4.  Call `tokenURI(tokenId)` for each badge to fetch its metadata and display details (name, image, attributes).
    5.  Call `getMilestoneInfo(tokenId)` to get specific data like mint date and level.
    *(Note: Frontend interaction might be mocked initially)*.

### `StackTheBox.sol` - Game Leaderboard

*   **Purpose:** To provide a transparent and verifiable leaderboard for the "Stack the Box" game within MomCare AI. It ensures fairness by recording scores on the blockchain and maintaining a ranked list of top players.
*   **Network:** Deployed on the **Monad Testnet**.
*   **Key Features:**
    *   **Score Submission:** Players interact via `submitScore(score)`, sending their achieved score. The contract only processes scores higher than the player's previously recorded best.
    *   **Personal High Score Tracking:** Uses the `highScores` mapping (`address => uint256`) to store the best score achieved by each individual player.
    *   **Ranked Leaderboard:** Maintains a fixed-size array (`leaderboard`) of `ScoreEntry` structs (`address player`, `uint256 score`), sorted in descending order of score.
    *   **Efficient Leaderboard Updates:** The internal `_updateLeaderboard` function handles inserting new high scores into the correct rank, removing a player's previous lower score if they improve, maintaining the sort order, and enforcing the `MAX_LEADERBOARD_SIZE`.
    *   **Fixed Size:** `MAX_LEADERBOARD_SIZE` constant prevents unbounded gas costs for leaderboard updates. Only the top scores are kept.
    *   **Events:** Emits `NewHighScore` when a player beats their personal best and `LeaderboardUpdated` when the ranked leaderboard changes.
    *   **View Functions:** Provides `getPlayerHighScore`, `getLeaderboard`, and `getLeaderboardLength` for easy data retrieval by the frontend.
    *   **Safety:** Uses Solidity `^0.8.29` with built-in overflow/underflow checks. The update logic includes checks to prevent common array manipulation errors.
*   **Frontend Integration:** Used by the game page ([`src/pages/GamesPage.tsx`](src/pages/GamesPage.tsx)). The frontend typically:
    1.  Calls `submitScore(score)` when a player finishes a game.
    2.  Calls `getLeaderboard()` periodically or listens for `LeaderboardUpdated` events to display the current top players and scores.
    3.  Optionally calls `getPlayerHighScore(playerAddress)` to show a user their personal best.

---

## ⚙️ Usage Workflow

### 1. Prerequisites

*   Node.js and npm/yarn (if using Hardhat/Truffle).
*   Solidity Compiler (`solc`): Version `^0.8.20` or higher for `MomCareMilestoneNFT`, `^0.8.29` or higher for `StackTheBox`.
*   Development Environment: [Remix IDE](https://remix.ethereum.org/), [Hardhat](https://hardhat.org/), or [Foundry](https://book.getfoundry.sh/).
*   Access to the Monad Testnet (RPC URL, testnet MONAD tokens).
*   Wallet/Account for deployment and interaction (e.g., MetaMask).

### 2. Installation (If using Hardhat/Foundry)

```bash
# Clone the repo (if applicable)
# cd your-project-directory

# Install dependencies (includes OpenZeppelin for MomCareMilestoneNFT)
npm install --save-dev @openzeppelin/contracts hardhat @nomicfoundation/hardhat-toolbox # etc.
# or
yarn add --dev @openzeppelin/contracts hardhat @nomicfoundation/hardhat-toolbox # etc.
# or setup Foundry project```

### 3. Compile

*   **Using Hardhat:**
    ```bash
    npx hardhat compile
    ```
*   **Using Foundry:**
    ```bash
    forge build
    ```
*   **Using `solc` (ensure OpenZeppelin is accessible):**
    ```sh
    # Compile StackTheBox
    solc contracts/StackTheBox.sol --optimize --bin --abi -o build/ --base-path . --include-path node_modules/

    # Compile MomCareMilestoneNFT (needs OpenZeppelin)
    solc contracts/MomCareMilestoneNFT.sol --optimize --via-ir --bin --abi -o build/ --base-path . --include-path node_modules/
    ```
*   **Using Remix:** Open the `.sol` files in Remix, select the correct compiler version, enable optimization, and compile.

### 4. Deploy

*   Use your chosen framework's deployment scripts (Hardhat, Foundry) or deploy manually via Remix.
*   Target the **Monad Testnet**.
*   For `MomCareMilestoneNFT`, the deployment transaction requires one constructor argument: the `initialOwner` address. This address will have administrative control over the contract.
    ```javascript
    // Example deployment argument (Ethers.js)
    const initialOwnerAddress = "0xYourOwnerAddress...";
    const MomCareNFTFactory = await ethers.getContractFactory("MomCareMilestoneNFT");
    const momCareNFT = await MomCareNFTFactory.deploy(initialOwnerAddress);
    await momCareNFT.deployed();
    console.log("MomCareMilestoneNFT deployed to:", momCareNFT.address);
    ```
*   `StackTheBox` has no constructor arguments.
*   **Record the deployed contract addresses.** They are needed for frontend configuration.

### 5. Configure Frontend

*   Update the contract addresses in the relevant frontend files:
    *   `StackTheBox` address in [`src/pages/GamesPage.tsx`](src/pages/GamesPage.tsx).
    *   `MomCareMilestoneNFT` address in [`src/pages/MonadPage.tsx`](src/pages/MonadPage.tsx) (replace `YOUR_DEPLOYED_CONTRACT_ADDRESS_ON_MONAD`).
*   Ensure the ABIs used in the frontend match the compiled ABIs (usually placed in `build/` or `artifacts/` folders after compilation). Update the ABI import in [`src/pages/MonadPage.tsx`](src/pages/MonadPage.tsx) for `MomCareMilestoneNFT`.

### 6. Interact

*   **`MomCareMilestoneNFT` Interaction:**
    *   **Owner:**
        *   `addMilestoneType(string memory _name)`: Define a new type of achievement.
        *   `updateMilestoneTypeName(uint256 _typeId, string memory _newName)`: Change the name of a type.
        *   `setMilestoneTypeEnabled(uint256 _typeId, bool _enabled)`: Enable/disable minting for a type.
        *   `batchMintMilestones(...)`: Mint badges for multiple users (e.g., via backend).
        *   `setTokenImageURI(uint256 _tokenId, string memory _imageURI)`: Set a specific image for a minted badge.
        *   `setBaseURI(string memory baseURI_)`: Set a base URI for metadata.
        *   `pause()` / `unpause()`: Control minting availability.
    *   **User (via Frontend):**
        *   `mintMilestoneBadge(uint256 _milestoneTypeId, uint256 _level)`: Claim a badge after meeting criteria.
        *   `burn(uint256 _tokenId)`: Destroy a badge they own.
    *   **Frontend/Anyone:**
        *   `getMilestoneTypeInfo(uint256 _typeId)`: Get details about a milestone type.
        *   `getMilestoneTypeCount()`: Get the total number of defined types.
        *   `getMilestoneInfo(uint256 _tokenId)`: Get data stored with a specific badge.
        *   `getTokenImageURI(uint256 _tokenId)`: Get the explicitly set image URI.
        *   `getUserOwnedTokens(address _user)`: List badges owned by a user.
        *   `getUserMilestoneLevel(address _user, uint256 _milestoneTypeId)`: Check the highest level achieved by a user for a type.
        *   `tokenURI(uint256 _tokenId)`: Get the metadata URI (on-chain generated or base URI based).
        *   `ownerOf(uint256 _tokenId)`: Get the owner of a specific badge.
        *   `balanceOf(address _owner)`: Get the number of badges owned by an address.
        *   Listen for events like `MilestoneMinted`.

*   **`StackTheBox` Interaction:**
    *   **User (via Frontend):**
        *   `submitScore(uint256 _score)`: Submit their score from the game.
    *   **Frontend/Anyone:**
        *   `getPlayerHighScore(address _player)`: Check a specific player's best score.
        *   `getLeaderboard()`: Fetch the current top scores and players.
        *   `getLeaderboardLength()`: Get the number of entries currently on the leaderboard.
        *   Listen for events like `NewHighScore` and `LeaderboardUpdated`.

---

## 🔒 Security Considerations & Best Practices

**MomCareMilestoneNFT:**

*   **Owner Key Security:** The `initialOwner` address has significant privileges. Secure this private key meticulously. Consider using a multi-sig wallet for ownership in production.
*   **Non-Transferability:** This is a core feature. Ensure no logic accidentally bypasses the `_update` hook check.
*   **Milestone Type Management:** Be mindful when adding/enabling/disabling types, as this directly affects user interaction. Ensure names are clear and non-offensive.
*   **Batch Minting Gas:** Be cautious with `batchMintMilestones`. Very large batches can exceed block gas limits. The contract includes a basic size limit (`<= 100`), but test this based on Monad's limits. Implement robust error handling in the calling backend service.
*   **Metadata Gas Costs:** On-chain `tokenURI` generation can be gas-intensive, especially with complex strings or many attributes. For large-scale use, consider implementing the off-chain metadata pattern using `setBaseURI` or `setTokenMetadataURI` (if added) and storing JSON on IPFS/Arweave/centralized servers.
*   **Pausable Mechanism:** Understand the implications of pausing/unpausing. This is an emergency stopgap.
*   **Access Control:** The contract uses `Ownable`. If more granular roles are needed (e.g., a separate `MINTER_ROLE` distinct from the owner), uncomment and implement the `AccessControl` pattern as noted in the code comments.

**StackTheBox:**

*   **Score Validation:** The contract *trusts* the score submitted via `submitScore`. **Crucially, implement robust anti-cheating mechanisms in the off-chain game logic and potentially the backend service that relays the transaction.** The contract itself cannot validate if the score was legitimately achieved.
*   **Leaderboard Size (`MAX_LEADERBOARD_SIZE`):** This constant controls the gas cost of updates. A larger size means higher potential gas costs for insertions/updates near the bottom of the board. Choose a reasonable size based on expected usage and gas limits.
*   **Data Privacy:** All scores and associated player addresses on the leaderboard are public blockchain data.
*   **Front-running:** While less critical for a leaderboard, be aware that score submissions are public transactions.

**General:**

*   **Testing:** Thoroughly test all functions and edge cases on the Monad Testnet before any potential mainnet deployment or integration with real user data. Use tools like Hardhat tests or Foundry tests.
*   **Audits:** For contracts handling significant value or core application logic, obtain a professional security audit.
*   **Upgradability:** These contracts are not currently designed as upgradeable (e.g., using proxies). If future logic changes are anticipated, consider implementing an upgradeable pattern (like UUPS) from the start.

---

## 📎 References

*   **Contract Code:**
    *   [`MomCareMilestoneNFT.sol`](contracts/MomCareMilestoneNFT.sol)
    *   [`StackTheBox.sol`](contracts/StackTheBox.sol)
*   **Frontend Integration Points:**
    *   Game Page: [`src/pages/GamesPage.tsx`](../src/pages/GamesPage.tsx)
    *   Milestones Page: [`src/pages/MonadPage.tsx`](../src/pages/MonadPage.tsx)
*   **Libraries & Standards:**
    *   [OpenZeppelin Contracts Documentation](https://docs.openzeppelin.com/contracts/5.x/)
    *   [ERC-721 Non-Fungible Token Standard](https://eips.ethereum.org/EIPS/eip-721)
*   **Blockchain:**
    *   [Monad Documentation](https://docs.monad.xyz/)

---