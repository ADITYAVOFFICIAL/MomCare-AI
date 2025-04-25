// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --- OpenZeppelin Imports ---
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
// Consider importing AccessControl if roles beyond 'owner' are needed later
// import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MomCare Milestone NFT (Enhanced & Optimized)
 * @author Aditya Verma (ADITYAVOFFICIAL)
 * @notice Gas-optimized ERC721 contract for non-transferable milestone badges on Monad.
 *         Features: Milestone levels, external image URIs, type management, batch minting, explicit burn.
 * @dev Inherits ERC721, Ownable, Pausable. Uses Counters, Strings, Base64.
 *      Implements non-transferability via _update hook.
 *      Consider moving metadata off-chain for significant gas savings if `tokenURI` calls become expensive.
 *      Consider using AccessControl for roles like MINTER_ROLE if needed.
 */
contract MomCareMilestoneNFT is ERC721, Ownable, Pausable /*, AccessControl */ {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // --- Roles (Optional - Uncomment if using AccessControl) ---
    // bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    // bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    // --- State Variables ---

    Counters.Counter private _tokenIdCounter;       // Counter for unique token IDs
    Counters.Counter private _milestoneTypeCounter; // Counter for unique milestone type IDs

    string private _baseTokenURI; // Optional Base URI (prepended to tokenURI if set)

    // --- Structs ---
    struct MilestoneTypeInfo {
        string name;    // Human-readable name
        bool exists;    // Ensures type ID is valid
        bool enabled;   // Allows/disallows minting for this type
    }

    struct MilestoneInfo {
        uint256 milestoneTypeId; // References MilestoneTypeInfo
        uint256 mintDate;        // Unix timestamp (seconds)
        uint256 level;           // Level achieved
    }

    // --- Mappings ---
    mapping(uint256 => MilestoneTypeInfo) public milestoneTypes;         // Milestone Type ID => Type Info
    mapping(uint256 => MilestoneInfo) public milestoneData;              // Token ID => Milestone Info
    mapping(uint256 => string) private _tokenImageURIs;                  // Token ID => External Image URI (optional)
    mapping(bytes32 => uint256) private _userMilestoneLevel;             // keccak256(user, typeId) => highest level minted
    mapping(address => uint256[]) public userOwnedTokenIds;              // User Address => Array of their Token IDs (for enumeration)

    // --- Events ---
    event MilestoneTypeAdded(uint256 indexed typeId, string name);
    event MilestoneTypeUpdated(uint256 indexed typeId, string newName);
    event MilestoneTypeEnabled(uint256 indexed typeId, bool enabled);
    event TokenImageURISet(uint256 indexed tokenId, string imageURI);
    event MilestoneMinted(
        address indexed recipient,
        uint256 indexed milestoneTypeId,
        string milestoneName,           // Included for off-chain convenience
        uint256 indexed tokenId,
        uint256 mintDate,
        uint256 level
    );
    // Note: Transfer event is emitted automatically by ERC721 _mint and _burn

    // --- Constructor ---
    /**
     * @notice Sets up the contract, NFT name, symbol, and initial owner.
     * @param initialOwner The address designated as the contract owner.
     */
    constructor(address initialOwner)
        ERC721("MomCare Milestone Badge", "MCMB")
        Ownable(initialOwner)
    {
        // Initialize milestone type counter (starts at 1, 0 is reserved)
        _milestoneTypeCounter.increment();

        // --- Optional: Grant roles if using AccessControl ---
        // _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        // _grantRole(MINTER_ROLE, initialOwner); // Grant owner minter role by default
        // _grantRole(URI_SETTER_ROLE, initialOwner); // Grant owner URI setter role by default
    }

    // --- Milestone Type Management Functions (Owner Only) ---

    /**
     * @notice Adds a new milestone type that can be minted. Enabled by default.
     * @dev Requires owner privileges. Emits {MilestoneTypeAdded}.
     * @param _name The human-readable name for the new milestone type (e.g., "7-Day Logging Streak").
     * @return typeId The newly assigned ID for this milestone type.
     */
    function addMilestoneType(string memory _name) external onlyOwner returns (uint256 typeId) {
        require(bytes(_name).length > 0, "MilestoneType: Name cannot be empty");
        typeId = _milestoneTypeCounter.current();
        milestoneTypes[typeId] = MilestoneTypeInfo({
            name: _name,
            exists: true,
            enabled: true // Enabled by default
        });
        _milestoneTypeCounter.increment();
        emit MilestoneTypeAdded(typeId, _name);
    }

    /**
     * @notice Updates the name of an existing milestone type.
     * @dev Requires owner privileges. Emits {MilestoneTypeUpdated}.
     * @param _typeId The ID of the milestone type to update.
     * @param _newName The new human-readable name.
     */
    function updateMilestoneTypeName(uint256 _typeId, string memory _newName) external onlyOwner {
        require(milestoneTypes[_typeId].exists, "MilestoneType: Invalid type ID");
        require(bytes(_newName).length > 0, "MilestoneType: Name cannot be empty");
        milestoneTypes[_typeId].name = _newName;
        emit MilestoneTypeUpdated(_typeId, _newName);
    }

    /**
     * @notice Enables or disables minting for a specific milestone type. Does not affect existing tokens.
     * @dev Requires owner privileges. Emits {MilestoneTypeEnabled}.
     * @param _typeId The ID of the milestone type to enable/disable.
     * @param _enabled True to enable minting, false to disable.
     */
    function setMilestoneTypeEnabled(uint256 _typeId, bool _enabled) external onlyOwner {
        require(milestoneTypes[_typeId].exists, "MilestoneType: Invalid type ID");
        milestoneTypes[_typeId].enabled = _enabled;
        emit MilestoneTypeEnabled(_typeId, _enabled);
    }

    /**
     * @notice Retrieves the full info (name, exists, enabled) for a milestone type.
     * @param _typeId The ID of the milestone type.
     * @return info The struct containing the milestone type's details.
     */
    function getMilestoneTypeInfo(uint256 _typeId) external view returns (MilestoneTypeInfo memory info) {
        require(milestoneTypes[_typeId].exists, "MilestoneType: Invalid type ID");
        return milestoneTypes[_typeId];
    }

    /**
     * @notice Gets the total number of registered milestone types (highest assigned ID).
     * @return The count of defined milestone types.
     */
    function getMilestoneTypeCount() external view returns (uint256) {
        // current() gives the next ID, so current() - 1 is the highest assigned ID (count if starting from 1)
        return _milestoneTypeCounter.current() - 1;
    }

    // --- Minting Functions ---

    /**
     * @notice Mints a single milestone badge for the caller (msg.sender) for achieving a specific level.
     * @dev Requires the contract not to be paused and the milestone type to be enabled.
     *      Prevents minting the same or lower level for a given user and type.
     *      Emits {MilestoneMinted}.
     * @param _milestoneTypeId The ID of the milestone type being achieved.
     * @param _level The level being achieved (must be > 0 and higher than previously minted level).
     */
    function mintMilestoneBadge(uint256 _milestoneTypeId, uint256 _level) external whenNotPaused {
        // --- Optional: Use AccessControl role check ---
        // require(hasRole(MINTER_ROLE, msg.sender), "Mint: Caller is not a minter");
        _mintInternal(msg.sender, _milestoneTypeId, _level);
    }

    /**
     * @notice Allows the owner (or MINTER_ROLE if using AccessControl) to mint badges for multiple users.
     * @dev Useful for backend integration. Be mindful of block gas limits with large batches.
     *      Emits multiple {MilestoneMinted} events.
     * @param _recipients Array of addresses to receive the badges.
     * @param _milestoneTypeIds Array of milestone type IDs corresponding to each recipient.
     * @param _levels Array of levels corresponding to each recipient and type ID.
     */
    function batchMintMilestones(
        address[] memory _recipients,
        uint256[] memory _milestoneTypeIds,
        uint256[] memory _levels
    ) external onlyOwner whenNotPaused { // Use `onlyRole(MINTER_ROLE)` if using AccessControl
        uint256 batchSize = _recipients.length;
        require(batchSize == _milestoneTypeIds.length && batchSize == _levels.length, "BatchMint: Array length mismatch");
        require(batchSize > 0, "BatchMint: Cannot mint empty batch");
        // Add a reasonable upper limit to prevent gas issues (adjust as needed based on testing)
        require(batchSize <= 100, "BatchMint: Batch size too large");

        for (uint256 i = 0; i < batchSize; i++) {
            // Consider adding internal try/catch if one failure shouldn't revert the whole batch,
            // though this adds complexity and gas cost per iteration.
            _mintInternal(_recipients[i], _milestoneTypeIds[i], _levels[i]);
        }
    }

    /**
     * @dev Internal minting logic. Validates inputs, checks conditions, updates state, and mints.
     * @param _recipient The address receiving the token.
     * @param _milestoneTypeId The ID of the milestone type.
     * @param _level The level being achieved.
     */
    function _mintInternal(address _recipient, uint256 _milestoneTypeId, uint256 _level) internal {
        require(_recipient != address(0), "Mint: Cannot mint to the zero address");
        require(milestoneTypes[_milestoneTypeId].exists, "Mint: Invalid milestone type ID");
        require(milestoneTypes[_milestoneTypeId].enabled, "Mint: Milestone type disabled");
        require(_level > 0, "Mint: Level must be positive");

        // Check if user already minted this level or higher for this type
        bytes32 milestoneUserHash = keccak256(abi.encodePacked(_recipient, _milestoneTypeId));
        require(_userMilestoneLevel[milestoneUserHash] < _level, "Mint: Level already achieved or lower");

        uint256 newTokenId = _tokenIdCounter.current();

        // Store milestone info
        milestoneData[newTokenId] = MilestoneInfo({
            milestoneTypeId: _milestoneTypeId,
            mintDate: block.timestamp,
            level: _level
        });

        // Update the highest level achieved and add token to user's list
        _userMilestoneLevel[milestoneUserHash] = _level;
        userOwnedTokenIds[_recipient].push(newTokenId);

        // Mint the ERC721 token
        _mint(_recipient, newTokenId); // Emits Transfer event
        _tokenIdCounter.increment();

        // Emit custom event
        string memory milestoneName = milestoneTypes[_milestoneTypeId].name;
        emit MilestoneMinted(_recipient, _milestoneTypeId, milestoneName, newTokenId, block.timestamp, _level);
    }

    // --- Image URI Management ---

    /**
     * @notice Sets an external image URI for a specific token ID. Can only be set once per token.
     * @dev Requires owner privileges (or URI_SETTER_ROLE). Emits {TokenImageURISet}.
     * @param _tokenId The ID of the token to set the image for.
     * @param _imageURI The string URI of the image (e.g., ipfs://..., https://...).
     */
    function setTokenImageURI(uint256 _tokenId, string memory _imageURI) external onlyOwner { // Use `onlyRole(URI_SETTER_ROLE)` if using AccessControl
        require(_ownerOf(_tokenId) != address(0), "SetURI: Token does not exist"); // Check token exists using owner check
        require(bytes(_tokenImageURIs[_tokenId]).length == 0, "SetURI: Image URI already set"); // Prevent overwriting
        require(bytes(_imageURI).length > 0, "SetURI: Image URI cannot be empty");

        _tokenImageURIs[_tokenId] = _imageURI;
        emit TokenImageURISet(_tokenId, _imageURI);
    }

    // --- View Functions ---

    /**
     * @notice Retrieves the milestone info (type ID, mint date, level) for a specific token ID.
     * @param _tokenId The ID of the token.
     * @return info A struct containing the milestone details.
     */
    function getMilestoneInfo(uint256 _tokenId) external view returns (MilestoneInfo memory info) {
        require(milestoneData[_tokenId].milestoneTypeId != 0, "View: Query for non-existent token info"); // Check if info was set
        return milestoneData[_tokenId];
    }

     /**
      * @notice Retrieves the external image URI set for a specific token ID, if any.
      * @param _tokenId The ID of the token.
      * @return The image URI string, or an empty string if not set.
      */
     function getTokenImageURI(uint256 _tokenId) external view returns (string memory) {
         // No existence check needed here, returns empty string if token doesn't exist or URI not set
         return _tokenImageURIs[_tokenId];
     }

    /**
     * @notice Retrieves the list of token IDs owned by a specific user.
     * @dev Useful for frontends to display a user's badges.
     * @param _user The user's address.
     * @return An array of token IDs owned by the user.
     */
    function getUserOwnedTokens(address _user) external view returns (uint256[] memory) {
        return userOwnedTokenIds[_user];
    }

    /**
     * @notice Checks the highest level a user has minted for a specific milestone type ID.
     * @param _user The user's address.
     * @param _milestoneTypeId The ID of the milestone type.
     * @return level The highest level minted by the user for this type (0 if none).
     */
     function getUserMilestoneLevel(address _user, uint256 _milestoneTypeId) external view returns (uint256 level) {
         bytes32 milestoneUserHash = keccak256(abi.encodePacked(_user, _milestoneTypeId));
         return _userMilestoneLevel[milestoneUserHash];
     }

    // --- Metadata Logic (Token URI - Enhanced) ---

    /**
     * @notice Returns the URI for a given token ID.
     * @dev Generates on-chain JSON metadata including name, description, level, mint date,
     *      and an optional external image URI if set via `setTokenImageURI`.
     *      If `_baseTokenURI` is set, it returns `_baseTokenURI` + `tokenId`.
     *      Otherwise, returns a Base64 encoded data URI with the generated JSON.
     * @param _tokenId The ID of the token.
     * @return A string containing the metadata URI.
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        // Check existence using owner check which is standard for ERC721 URI functions
        require(_ownerOf(_tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");

        // --- Optimization Note ---
        // On-chain JSON generation below is GAS INTENSIVE. For production, strongly consider:
        // 1. Storing metadata off-chain (IPFS/Arweave/Server).
        // 2. Adding `setTokenMetadataURI(uint256 tokenId, string memory metadataURI)` function.
        // 3. Modifying this function to simply return the stored metadata URI.
        // -------------------------

        MilestoneInfo memory info = milestoneData[_tokenId]; // Assumes token exists from check above
        string memory milestoneName = milestoneTypes[info.milestoneTypeId].name; // Assumes type exists if token exists
        string memory imageURI = _tokenImageURIs[_tokenId];

        // Build attributes JSON part
        string memory attributesJson = string(abi.encodePacked(
            '{"trait_type": "Milestone", "value": "', milestoneName, '"},',
            '{"trait_type": "Milestone Type ID", "value": ', info.milestoneTypeId.toString(), '},',
            '{"trait_type": "Level", "value": ', info.level.toString(), '},',
            '{"trait_type": "Mint Date", "value": ', info.mintDate.toString(), ', "display_type": "date"}'
        ));

        // Build the full JSON
        string memory json = string(abi.encodePacked(
            '{',
                '"name": "', string(abi.encodePacked(name(), " #", _tokenId.toString(), " - ", milestoneName, " Lvl ", info.level.toString())), '",',
                '"description": "A non-transferable MomCare AI milestone badge. Achieved: ', milestoneName, ' Level ', info.level.toString(), '.",',
                // Conditionally include image field only if imageURI is set
                bytes(imageURI).length > 0 ? string(abi.encodePacked('"image": "', imageURI, '",')) : "",
                '"attributes": [', attributesJson, ']',
            '}'
        ));

        // Return Base64 data URI or prepend base URI
        if (bytes(_baseTokenURI).length > 0) {
            // Assumes base URI server expects appending the token ID. Adjust if different format needed.
            return string(abi.encodePacked(_baseTokenURI, _tokenId.toString()));
        } else {
            return string(abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            ));
        }
    }

    /**
     * @notice Gets the base URI set for the collection.
     * @return The base URI string.
     */
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Sets a new base URI for the collection (owner only).
     * @dev If set, `tokenURI` will return `baseURI` + `tokenId`. Clear by setting to empty string.
     * @param baseURI_ The new base URI string.
     */
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    // --- Pausable Control ---

    /** @notice Pauses minting functions. Requires owner privileges. */
    function pause() external onlyOwner { _pause(); }

    /** @notice Unpauses minting functions. Requires owner privileges. */
    function unpause() external onlyOwner { _unpause(); }

    // --- Burn Function ---

    /**
     * @notice Allows the owner of a token to burn (permanently destroy) it.
     * @dev Emits a {Transfer} event to the zero address. Updates internal tracking.
     * @param _tokenId The ID of the token to burn.
     */
    function burn(uint256 _tokenId) external virtual {
        // **FIXED:** Check ownership directly using _ownerOf
        require(_ownerOf(_tokenId) == msg.sender, "Burn: Caller is not owner");
        // The _update hook called by _burn handles the userOwnedTokenIds removal and non-transferability enforcement.
        _burn(_tokenId); // Emits Transfer event
    }

    // --- Hook Overrides ---

    /**
     * @dev Hook called before any token transfer, including mint and burn.
     *      Enforces non-transferability (reverts on actual transfers).
     *      Handles removal from `userOwnedTokenIds` during burns.
     *      Overrides {ERC721-_update}.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        if (from == address(0)) {
            // Minting: Allowed. `userOwnedTokenIds` updated in _mintInternal.
        } else if (to == address(0)) {
            // Burning: Allowed. Remove token from owner's list *before* state change.
            _removeTokenFromUserList(from, tokenId);
        } else {
            // Transferring: Revert.
            revert("Transfer: Badges are non-transferable");
        }
        // Call parent _update which handles ownership changes and emits Transfer event
        return super._update(to, tokenId, auth);
    }

    // --- Internal Helper ---

    /**
     * @dev Removes a token ID from a user's `userOwnedTokenIds` array efficiently.
     *      Uses the swap-and-pop technique. O(n) search, O(1) removal after find.
     * @param _user The address of the user whose list is being modified.
     * @param _tokenId The token ID to remove.
     */
    function _removeTokenFromUserList(address _user, uint256 _tokenId) internal {
        uint256[] storage tokenList = userOwnedTokenIds[_user];
        uint256 listLength = tokenList.length;
        if (listLength == 0) return; // Nothing to remove

        uint256 lastIndex = listLength - 1;
        uint256 tokenIndex = type(uint256).max; // Sentinel value indicates not found yet

        // Find the index of the token to remove
        // Optimize: Check the last element first as it's cheapest to remove
        if (tokenList[lastIndex] == _tokenId) {
            tokenIndex = lastIndex;
        } else {
            // Search the rest of the array if it wasn't the last element
            // Loop only up to `lastIndex` because we already checked it
            for (uint256 i = 0; i < lastIndex; i++) {
                if (tokenList[i] == _tokenId) {
                    tokenIndex = i;
                    break; // Found it
                }
            }
        }

        // Perform swap-and-pop if the token was found
        if (tokenIndex != type(uint256).max) { // Check if found
            if (tokenIndex != lastIndex) { // Avoid copying if it's already the last element
                // Swap the found element with the last element
                tokenList[tokenIndex] = tokenList[lastIndex];
            }
            // Remove the last element (which is either the original last, or the one we swapped)
            tokenList.pop();
        }
        // If tokenIndex remains type(uint256).max, the token wasn't in the list (this shouldn't happen if called correctly after ownership checks)
    }

    // --- Interface Support (ERC165) ---

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721 /*, AccessControl */) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
            // Uncomment if using AccessControl: || interfaceId == type(IAccessControl).interfaceId
    }
}