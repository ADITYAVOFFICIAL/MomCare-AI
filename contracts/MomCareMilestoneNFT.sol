// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Use a recent 0.8.x version compatible with OZ 5.x

// --- OpenZeppelin Imports ---
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title MomCare Milestone NFT (Gas Optimized)
 * @author Aditya Verma (ADITYAVOFFICIAL)
 * @notice Gas-optimized ERC721 contract for non-transferable milestone badges on Monad.
 *         Uses Milestone Type IDs to reduce storage costs. Metadata generated on-chain.
 * @dev Inherits ERC721, Ownable, Pausable. Uses Counters, Strings, Base64.
 *      Implements non-transferability via _update hook.
 *      Stores milestone type ID per token instead of full string name.
 */
contract MomCareMilestoneNFT is ERC721, Ownable, Pausable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // --- State Variables ---

    Counters.Counter private _tokenIdCounter;       // Counter for unique token IDs
    Counters.Counter private _milestoneTypeCounter; // Counter for unique milestone type IDs

    // Optional Base URI
    string private _baseTokenURI;

    // --- Milestone Type Management ---
    struct MilestoneTypeInfo {
        string name;    // Human-readable name (e.g., "7-Day Logging Streak")
        bool exists;    // Flag to confirm the type ID is valid
    }
    // Mapping from Milestone Type ID => Milestone Type Info
    mapping(uint256 => MilestoneTypeInfo) public milestoneTypes;
    // ---

    // --- Token Specific Data ---
    struct MilestoneInfo {
        uint256 milestoneTypeId; // ID referencing the type defined in milestoneTypes
        uint256 mintDate;        // Unix timestamp (seconds) when the badge was minted
        // address owner; // Removed - rely on _ownerOf(tokenId)
    }
    // Mapping from Token ID => Milestone Info (stores type ID, not name)
    mapping(uint256 => MilestoneInfo) public milestoneData;
    // ---

    // --- Tracking Mappings ---
    // Mapping to prevent duplicate mints for a user *and* specific milestone type
    // Key: keccak256(abi.encodePacked(userAddress, milestoneTypeId))
    mapping(bytes32 => bool) private _userHasMintedMilestoneType;

    // Mapping for frontend querying: User Address => Array of their Token IDs
    mapping(address => uint256[]) public userOwnedTokenIds;
    // ---

    // --- Events ---
    event MilestoneTypeAdded(uint256 indexed typeId, string name);
    event MilestoneMinted(
        address indexed recipient,
        uint256 indexed milestoneTypeId, // Emit type ID
        string milestoneName,             // Also emit name for convenience
        uint256 indexed tokenId,
        uint256 mintDate
    );

    // --- Constructor ---
    constructor(address initialOwner)
        ERC721("MomCare Milestone Badge", "MCMB") // Set NFT Name and Symbol
        Ownable(initialOwner) // Set initial owner
    {
        // Initialize milestone type counter (starts at 1, 0 can indicate unset/invalid)
        _milestoneTypeCounter.increment();
    }

    // --- Milestone Type Management Functions (Owner Only) ---

    /**
     * @notice Allows the contract owner to register a new type of milestone.
     * @dev Assigns a unique ID to the milestone name and stores it. Emits MilestoneTypeAdded event.
     * @param _name The human-readable name for the new milestone type.
     * @return typeId The newly assigned ID for this milestone type.
     */
    function addMilestoneType(string memory _name) external onlyOwner returns (uint256 typeId) {
        require(bytes(_name).length > 0, "Milestone: Name cannot be empty");
        typeId = _milestoneTypeCounter.current();
        milestoneTypes[typeId] = MilestoneTypeInfo({ name: _name, exists: true });
        _milestoneTypeCounter.increment();
        emit MilestoneTypeAdded(typeId, _name);
    }

    /**
     * @notice Retrieves the name of a milestone type given its ID.
     * @param _typeId The ID of the milestone type.
     * @return The name of the milestone type.
     */
    function getMilestoneTypeName(uint256 _typeId) external view returns (string memory) {
        require(milestoneTypes[_typeId].exists, "Milestone: Invalid type ID");
        return milestoneTypes[_typeId].name;
    }

    /**
     * @notice Gets the total number of registered milestone types.
     * @return The next available type ID (which is one more than the highest assigned ID).
     */
    function getMilestoneTypeCount() external view returns (uint256) {
        // Current() gives the next ID to be assigned, so it represents the count + 1 (if starting from 1)
        // Since we increment *after* assigning, current() is the next ID.
        // If counter starts at 1, count is current() - 1.
        return _milestoneTypeCounter.current() - 1;
    }


    // --- Minting Function ---

    /**
     * @notice Allows a user (msg.sender) to mint a badge for achieving a specific milestone type.
     * @dev Checks pause status, milestone type validity, and prevents duplicate mints per user per type.
     * @param _milestoneTypeId The ID of the milestone type being achieved (must be pre-registered by owner).
     */
    function mintMilestoneBadge(uint256 _milestoneTypeId) external whenNotPaused {
        address recipient = msg.sender;

        // Verify the milestone type ID is valid (was added by owner)
        require(milestoneTypes[_milestoneTypeId].exists, "Milestone: Invalid type ID");

        // Generate hash for duplicate check using user address and type ID
        bytes32 milestoneUserHash = keccak256(abi.encodePacked(recipient, _milestoneTypeId));
        require(!_userHasMintedMilestoneType[milestoneUserHash], "Milestone: Badge for this type already claimed");

        uint256 newTokenId = _tokenIdCounter.current();

        // Store only the type ID and mint date
        milestoneData[newTokenId] = MilestoneInfo({
            milestoneTypeId: _milestoneTypeId,
            mintDate: block.timestamp
            // owner removed
        });

        _userHasMintedMilestoneType[milestoneUserHash] = true;
        userOwnedTokenIds[recipient].push(newTokenId);

        _mint(recipient, newTokenId);
        _tokenIdCounter.increment();

        // Retrieve name for the event
        string memory milestoneName = milestoneTypes[_milestoneTypeId].name;
        emit MilestoneMinted(recipient, _milestoneTypeId, milestoneName, newTokenId, block.timestamp);
    }

    // --- View Functions ---

    /**
     * @notice Retrieves the milestone info (type ID, mint date) for a specific token ID.
     * @param _tokenId The ID of the token.
     * @return info A struct containing the milestone type ID and mint date.
     */
    function getMilestoneInfo(uint256 _tokenId) external view returns (MilestoneInfo memory info) {
        // Check existence by seeing if milestoneTypeId was set (it starts at 0, we start IDs from 1)
        require(milestoneData[_tokenId].milestoneTypeId != 0, "Milestone: Query for non-existent token");
        return milestoneData[_tokenId];
    }

    /**
     * @notice Retrieves the list of token IDs owned by a specific user.
     * @param _user The user's address.
     * @return An array of token IDs.
     */
    function getUserOwnedTokens(address _user) external view returns (uint256[] memory) {
        return userOwnedTokenIds[_user];
    }

    /**
     * @notice Checks if a user has minted a badge for a specific milestone type ID.
     * @param _user The user's address.
     * @param _milestoneTypeId The ID of the milestone type.
     * @return True if the user has minted this badge type, false otherwise.
     */
     function hasUserMintedType(address _user, uint256 _milestoneTypeId) external view returns (bool) {
         bytes32 milestoneUserHash = keccak256(abi.encodePacked(_user, _milestoneTypeId));
         return _userHasMintedMilestoneType[milestoneUserHash];
     }

    // --- Metadata Logic (Token URI) ---

    /**
     * @notice Returns the URI for a given token ID, generating on-chain JSON metadata.
     * @dev Fetches milestone type name using the stored ID to include in the metadata.
     * @param _tokenId The ID of the token.
     * @return A string containing the data URI for the token's metadata.
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(milestoneData[_tokenId].milestoneTypeId != 0, "ERC721: URI query for non-existent token");

        MilestoneInfo memory info = milestoneData[_tokenId];
        // Fetch the name corresponding to the stored type ID
        string memory milestoneName = milestoneTypes[info.milestoneTypeId].name;

        // Construct JSON metadata
        string memory json = string(abi.encodePacked(
            '{',
                '"name": "', string(abi.encodePacked(name(), " #", _tokenId.toString(), " - ", milestoneName)), '",',
                '"description": "A non-transferable milestone badge awarded by MomCare AI for achieving: ', milestoneName, '.",',
                // '"image": "ipfs://YOUR_IMAGE_CID/",', // Optional image link
                '"attributes": [',
                    '{',
                        '"trait_type": "Milestone", ',
                        '"value": "', milestoneName, '"', // Use looked-up name
                    '},',
                    '{',
                        '"trait_type": "Milestone Type ID", ', // Add Type ID attribute
                        '"value": ', info.milestoneTypeId.toString(),
                    '},',
                     '{',
                        '"trait_type": "Mint Date", ',
                        '"value": ', info.mintDate.toString(), ',',
                        '"display_type": "date"',
                    '}',
                ']',
            '}'
        ));

        // Return Base64 encoded data URI
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    /** @dev Base URI for the collection. */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /** @notice Sets a new base URI (owner only). */
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    // --- Pausable Control ---
    /** @notice Pauses minting (owner only). */
    function pause() external onlyOwner { _pause(); }
    /** @notice Unpauses minting (owner only). */
    function unpause() external onlyOwner { _unpause(); }

    // --- Non-Transferability & Hook Overrides ---

    /**
     * @dev Hook enforcing non-transferability. Allows minting and burning only.
     *      Overrides {ERC721-_update}. Updates user token list on burn.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        if (from == address(0)) {
            // Minting: Allowed.
        } else if (to == address(0)) {
            // Burning: Allowed. Remove token from owner's list *before* state change.
            _removeTokenFromUserList(from, tokenId);
        } else {
            // Transferring: Revert.
            revert("MomCareMilestoneNFT: Badges are non-transferable");
        }
        // Call parent _update
        return super._update(to, tokenId, auth);
    }

    // --- Internal Helper for Burn ---

    /**
     * @dev Removes a token ID from a user's list efficiently (swap and pop).
     * @param _user The address of the user.
     * @param _tokenId The token ID to remove.
     */
    function _removeTokenFromUserList(address _user, uint256 _tokenId) internal {
        uint256[] storage tokenList = userOwnedTokenIds[_user];
        uint256 listLength = tokenList.length;
        if (listLength == 0) return;

        uint256 lastIndex = listLength - 1;
        uint256 tokenIndex = type(uint256).max;

        // Find index (optimize check for last element)
        if (tokenList[lastIndex] == _tokenId) {
            tokenIndex = lastIndex;
        } else {
            for (uint256 i = 0; i < lastIndex; i++) {
                if (tokenList[i] == _tokenId) {
                    tokenIndex = i;
                    break;
                }
            }
        }

        // Swap and pop if found
        if (tokenIndex != type(uint256).max) {
            if (tokenIndex != lastIndex) {
                tokenList[tokenIndex] = tokenList[lastIndex];
            }
            tokenList.pop();
        }
    }

    // --- Interface Support (ERC165) ---
    /** @dev See {IERC165-supportsInterface}. */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}