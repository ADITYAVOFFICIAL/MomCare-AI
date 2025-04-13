// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29; // Using a recent version with built-in overflow checks

/**
 * @title StackTheBox
 * @dev A smart contract for a "Stack the Box" game leaderboard on Monad.
 * Players submit scores achieved in an off-chain version of the game.
 * The contract tracks individual high scores and maintains a global leaderboard,
 * ensuring players only occupy one spot with their highest score.
 * Optimized to handle leaderboard updates efficiently.
 */
contract StackTheBox {

    // --- Events ---

    /**
     * @dev Emitted when a player achieves a new personal high score.
     * @param player The address of the player.
     * @param score The new high score achieved.
     */
    event NewHighScore(address indexed player, uint256 score);

    /**
     * @dev Emitted when the leaderboard is updated with a new entry or a change in rank.
     * @param player The address of the player added or updated.
     * @param score The score that qualified for the leaderboard.
     * @param rank The rank achieved on the leaderboard (0-indexed).
     */
    event LeaderboardUpdated(address indexed player, uint256 score, uint256 rank);

    // --- State Variables ---

    /**
     * @dev Structure to hold leaderboard entry data.
     */
    struct ScoreEntry {
        address player;
        uint256 score;
    }

    /**
     * @dev Mapping from player address to their highest score achieved.
     */
    mapping(address => uint256) public highScores;

    /**
     * @dev Array storing the top scores, sorted highest score first.
     *      Fixed max size for gas control.
     */
    ScoreEntry[] public leaderboard;

    /**
     * @dev Maximum number of entries allowed on the leaderboard.
     */
    uint256 public constant MAX_LEADERBOARD_SIZE = 10; // Keep reasonably small

    // --- Constructor ---
    // No specific constructor logic needed.

    // --- Public Functions ---

    /**
     * @notice Submit a score achieved in the off-chain game.
     * @dev Checks if the score is a new personal high score for the sender.
     *      If it is, updates the high score and attempts to update the global leaderboard.
     *      Reverts if arithmetic errors occur during leaderboard update (e.g., due to array index issues).
     * @param _score The score achieved by the player (msg.sender). Must be > 0.
     */
    function submitScore(uint256 _score) external {
        // Basic validation: Ensure score is positive.
        // While 0 could be valid, it likely won't make the leaderboard and saves gas to check.
        require(_score > 0, "Score must be positive");

        address player = msg.sender;
        uint256 currentHighScore = highScores[player];

        // Only process if the new score is strictly better than the player's existing high score
        if (_score > currentHighScore) {
            highScores[player] = _score;
            emit NewHighScore(player, _score);

            // Attempt to update the leaderboard with this new high score
            // This internal function contains the core logic and safety checks
            _updateLeaderboard(player, _score);
        }
        // If score is not higher, do nothing (no event, no leaderboard update).
    }

    // --- View Functions ---

    /**
     * @notice Get the personal high score for a specific player.
     * @param _player The address of the player.
     * @return uint256 The highest score recorded for the player (0 if none recorded).
     */
    function getPlayerHighScore(address _player) external view returns (uint256) {
        return highScores[_player];
    }

    /**
     * @notice Get the current leaderboard entries.
     * @return ScoreEntry[] memory An array containing the current leaderboard entries, sorted high to low.
     */
    function getLeaderboard() external view returns (ScoreEntry[] memory) {
        return leaderboard;
    }

     /**
     * @notice Get the current number of entries on the leaderboard.
     * @return uint256 The number of entries currently stored (<= MAX_LEADERBOARD_SIZE).
     */
    function getLeaderboardLength() external view returns (uint256) {
        return leaderboard.length;
    }

    // --- Internal Functions ---

    /**
     * @dev Internal function to update the leaderboard if the new score qualifies.
     *      Maintains sorted order (highest score first) and size limit.
     *      Handles cases where the player is already on the leaderboard.
     *      Uses Solidity ^0.8 built-in checks to prevent overflow/underflow panics.
     * @param _player The player who achieved the score.
     * @param _score The new high score.
     */
    function _updateLeaderboard(address _player, uint256 _score) internal {
        uint256 leaderboardLen = leaderboard.length;
        uint256 insertionPoint = leaderboardLen; // Default: append if score qualifies & board not full
        uint256 oldIndex = leaderboardLen; // Sentinel value indicating player not found yet
        bool playerWasOnBoard = false;

        // --- Step 1: Find insertion point & check if player is already on board ---
        // Iterate downwards is slightly more efficient if high scores are common updates near top
        for (uint256 i = 0; i < leaderboardLen; i++) {
            // Check if this is the player's existing entry
            if (leaderboard[i].player == _player) {
                // If existing score is >= new score, no update needed at all
                if (leaderboard[i].score >= _score) {
                    // Existing score is better or equal, nothing to do for leaderboard
                    return;
                }
                // Player is on board with a lower score. Mark for removal later.
                playerWasOnBoard = true;
                oldIndex = i;
                // Continue searching for the correct insertion point for the *new* score
            }

            // Find the first spot where the new score is strictly greater
            // This determines the insertion index.
            // We check `insertionPoint == leaderboardLen` to only set it once.
            if (_score > leaderboard[i].score && insertionPoint == leaderboardLen) {
                insertionPoint = i;
                // Don't break here; need to continue checking if player's old score exists further down
            }
        }

        // --- Step 2: Determine if the score qualifies ---
        // Score qualifies if:
        // 1. It found an insertion point within the current list's bounds (insertionPoint < leaderboardLen) OR
        // 2. The list is not full (leaderboardLen < MAX_LEADERBOARD_SIZE) OR
        // 3. The player was already on the board (needs update regardless of board being full, handled by playerWasOnBoard flag)
        bool scoreQualifies = insertionPoint < leaderboardLen || leaderboardLen < MAX_LEADERBOARD_SIZE || playerWasOnBoard;

        if (!scoreQualifies) {
            // Score is lower than all scores on a full board, and player wasn't on it.
            return;
        }

        // --- Step 3: Remove existing lower score entry if necessary ---
        // This must happen *before* making space for the new entry
        if (playerWasOnBoard) {
            // Shift elements left starting from the old index to overwrite it
            // Loop runs from oldIndex up to the second-to-last element index
            for (uint256 i = oldIndex; i < leaderboardLen - 1; i++) {
                // Solidity ^0.8 reverts if leaderboardLen is 0 here, but playerWasOnBoard=true implies len >= 1
                leaderboard[i] = leaderboard[i + 1]; // Safe access due to loop bounds
            }
            leaderboard.pop(); // Remove the last element (which is now a duplicate or the original last)
            leaderboardLen--; // Update our local length variable

            // Adjust insertionPoint if the removal happened at or before it
            if (oldIndex <= insertionPoint && insertionPoint > 0) {
                 // insertionPoint > 0 check prevents underflow if oldIndex=0, insertionPoint=0
                insertionPoint--; // Safe decrement due to checks
            }
             // If oldIndex == insertionPoint, the new score replaces the old one at the same rank (or slightly higher if others shifted)
        }

        // --- Step 4: Make space for the new entry if needed ---
        uint256 finalLeaderboardLengthTarget; // What the length should be after insertion

        if (leaderboardLen < MAX_LEADERBOARD_SIZE) {
            // Board is not full (either initially, or after removing player's old score)
            finalLeaderboardLengthTarget = leaderboardLen + 1; // Length will increase by 1
            // Add placeholder only if player wasn't already removed (pop already made space)
            if (!playerWasOnBoard) {
                 leaderboard.push(); // Add placeholder slot at the end
            }
             // If playerWasOnBoard, pop already happened, length is correct for insertion.
        } else {
            // Board is full (and player was not on it, otherwise handled above)
            // We only insert if the new score is better than the current lowest score
            if (insertionPoint < MAX_LEADERBOARD_SIZE) {
                // New score is good enough to replace the last one
                finalLeaderboardLengthTarget = MAX_LEADERBOARD_SIZE; // Length remains the same
                // No push needed. Pop the last element *before* shifting if player wasn't removed.
                 if (!playerWasOnBoard) { // This check might be redundant given the outer condition
                     leaderboard.pop(); // Remove lowest score entry
                     // Must push placeholder after pop to maintain length for shifting loop
                     leaderboard.push(); // Add placeholder back temporarily
                 }
            } else {
                // Insertion point is beyond the end of the full board - score doesn't qualify
                return;
            }
        }


        // --- Step 5: Shift elements right for insertion ---
        uint256 currentEffectiveLength = leaderboard.length; // Get the true length AFTER push/pop adjustments

        // Only shift if necessary (insertionPoint is not at the end) and possible (length > 0)
        // *** FIX APPLIED HERE: Guard against underflow on length 0 ***
        if (currentEffectiveLength > 0 && insertionPoint < currentEffectiveLength) {
            // Check if there's actually a gap to shift into (relevant if push didn't happen)
            // Use a safe decrementing loop structure: start from index before last, end when i <= insertionPoint
            for (uint256 i = currentEffectiveLength - 1; i > insertionPoint; i--) {
                 // Shift element from i-1 to i
                leaderboard[i] = leaderboard[i - 1]; // Safe access due to loop bounds and length check
            }
        }

        // --- Step 6: Insert the new score ---
        // Ensure insertionPoint is valid (should be guaranteed by logic if correct)
        if (insertionPoint < leaderboard.length) {
            leaderboard[insertionPoint] = ScoreEntry(_player, _score);

             // If we added a placeholder temporarily for shifting on a full board, remove it now.
             if (leaderboard.length > MAX_LEADERBOARD_SIZE) {
                 leaderboard.pop();
             }

            emit LeaderboardUpdated(_player, _score, insertionPoint);
        }
        // Else: Should not happen, indicates logic error if insertionPoint is out of bounds.
        // Consider adding a revert("Leaderboard update internal error");
    }
}