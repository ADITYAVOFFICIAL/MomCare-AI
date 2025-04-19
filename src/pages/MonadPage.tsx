// src/pages/MonadPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ethers, Contract, BrowserProvider, Signer, BigNumberish } from 'ethers'; // Make sure ethers is imported
import { format } from 'date-fns';

// --- UI Imports ---
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Loader2, AlertTriangle, CheckCircle, BadgeCheck, Wallet, LinkIcon, RefreshCw,
    Network, LogOut, ExternalLink, Info, Sparkles, CalendarCheck, HeartPulse, Share2, User, Star // <-- Added User icon import
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

// --- Contract Configuration (REPLACE WITH YOUR ACTUAL VALUES) ---
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS_ON_MONAD'; // <-- PASTE ACTUAL ADDRESS HERE
const CONTRACT_ABI = [ // <-- PASTE ACTUAL FULL ABI HERE (ensure it matches deployed contract)
	{ "inputs": [ { "internalType": "address", "name": "initialOwner", "type": "address" } ], "stateMutability": "nonpayable", "type": "constructor" },
	{ "inputs": [ { "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "address", "name": "owner", "type": "address" } ], "name": "ERC721IncorrectOwner", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "ERC721InsufficientApproval", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "approver", "type": "address" } ], "name": "ERC721InvalidApprover", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "operator", "type": "address" } ], "name": "ERC721InvalidOperator", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "owner", "type": "address" } ], "name": "ERC721InvalidOwner", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "receiver", "type": "address" } ], "name": "ERC721InvalidReceiver", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "sender", "type": "address" } ], "name": "ERC721InvalidSender", "type": "error" },
	{ "inputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "ERC721NonexistentToken", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "owner", "type": "address" } ], "name": "OwnableInvalidOwner", "type": "error" },
	{ "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ], "name": "OwnableUnauthorizedAccount", "type": "error" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "approved", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "Approval", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" } ], "name": "ApprovalForAll", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "milestoneTypeId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "milestoneName", "type": "string" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "mintDate", "type": "uint256" } ], "name": "MilestoneMinted", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "typeId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" } ], "name": "MilestoneTypeAdded", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "OwnershipTransferred", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": false, "internalType": "address", "name": "account", "type": "address" } ], "name": "Paused", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "Transfer", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": false, "internalType": "address", "name": "account", "type": "address" } ], "name": "Unpaused", "type": "event" },
	{ "inputs": [ { "internalType": "string", "name": "_name", "type": "string" } ], "name": "addMilestoneType", "outputs": [ { "internalType": "uint256", "name": "typeId", "type": "uint256" } ], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "owner", "type": "address" } ], "name": "balanceOf", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "getApproved", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_tokenId", "type": "uint256" } ], "name": "getMilestoneInfo", "outputs": [ { "components": [ { "internalType": "uint256", "name": "milestoneTypeId", "type": "uint256" }, { "internalType": "uint256", "name": "mintDate", "type": "uint256" } ], "internalType": "struct MomCareMilestoneNFT.MilestoneInfo", "name": "info", "type": "tuple" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "getMilestoneTypeCount", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_typeId", "type": "uint256" } ], "name": "getMilestoneTypeName", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "_user", "type": "address" } ], "name": "getUserOwnedTokens", "outputs": [ { "internalType": "uint256[]", "name": "", "type": "uint256[]" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "_user", "type": "address" }, { "internalType": "uint256", "name": "_milestoneTypeId", "type": "uint256" } ], "name": "hasUserMintedType", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" } ], "name": "isApprovedForAll", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "milestoneData", "outputs": [ { "internalType": "uint256", "name": "milestoneTypeId", "type": "uint256" }, { "internalType": "uint256", "name": "mintDate", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "milestoneTypes", "outputs": [ { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "bool", "name": "exists", "type": "bool" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_milestoneTypeId", "type": "uint256" } ], "name": "mintMilestoneBadge", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [], "name": "name", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "ownerOf", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "pause", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [], "name": "paused", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "data", "type": "bytes" } ], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" } ], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "string", "name": "baseURI_", "type": "string" } ], "name": "setBaseURI", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" } ], "name": "supportsInterface", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "symbol", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_tokenId", "type": "uint256" } ], "name": "tokenURI", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" } ], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "newOwner", "type": "address" } ], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [], "name": "unpause", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "userOwnedTokenIds", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }
];

// --- Monad Network Details (VERIFY THESE!) ---
const MONAD_CHAIN_ID = '0x279f'; // 10143 - Example, VERIFY!
const MONAD_NETWORK_NAME = 'Monad Testnet'; // VERIFY!
const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz'; // VERIFY!
const MONAD_CURRENCY_SYMBOL = 'MON'; // VERIFY!
const MONAD_CURRENCY_DECIMALS = 18;
const MONAD_BLOCK_EXPLORER_URL = 'https://testnet.monadexplorer.com'; // VERIFY!

const MONAD_NETWORK_PARAMS = {
  chainId: MONAD_CHAIN_ID, chainName: MONAD_NETWORK_NAME,
  nativeCurrency: { name: MONAD_NETWORK_NAME, symbol: MONAD_CURRENCY_SYMBOL, decimals: MONAD_CURRENCY_DECIMALS },
  rpcUrls: [MONAD_RPC_URL], blockExplorerUrls: [MONAD_BLOCK_EXPLORER_URL],
};

// --- Types ---
interface MilestoneBase {
    id: string;
    contractName: string;
    description: string;
    icon: React.ElementType;
    eligibilityCheck: () => Promise<boolean>;
}
interface Milestone extends MilestoneBase {
    typeId: number;
    name: string;
}
interface MintedBadge {
    tokenId: string;
    milestoneTypeId: number;
    name: string;
    date: Date;
    metadata?: {
        name?: string;
        description?: string;
        attributes?: { trait_type: string; value: string | number; display_type?: string }[]; // Added optional display_type
    } | null;
}

// --- Helper Functions ---
const shortenAddress = (address: string | undefined | null): string => {
  if (!address) return '...';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// --- Main Page Component ---
const MonadPage: React.FC = () => {
    // --- State ---
    const { user } = useAuthStore();
    const { toast } = useToast();

    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
    const [networkName, setNetworkName] = useState<string | null>(null);
    const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean>(false);
    const [userExplicitlyDisconnected, setUserExplicitlyDisconnected] = useState<boolean>(false);
    const [contractError, setContractError] = useState<string | null>(null);

    const [contract, setContract] = useState<Contract | null>(null);
    const [readOnlyContract, setReadOnlyContract] = useState<Contract | null>(null);
    const [availableMilestones, setAvailableMilestones] = useState<Milestone[]>([]);
    const [isLoadingMilestones, setIsLoadingMilestones] = useState<boolean>(true);
    const [isMinting, setIsMinting] = useState<Record<number, boolean>>({});
    const [mintingError, setMintingError] = useState<Record<number, string | null>>({});
    const [mintingSuccessTx, setMintingSuccessTx] = useState<Record<number, string | null>>({});
    const [userBadges, setUserBadges] = useState<MintedBadge[]>([]);
    const [isLoadingBadges, setIsLoadingBadges] = useState<boolean>(false);
    const [hasCheckedEligibility, setHasCheckedEligibility] = useState<Record<number, boolean>>({});
    const [isEligible, setIsEligible] = useState<Record<number, boolean>>({});
    const [isCheckingEligibility, setIsCheckingEligibility] = useState<Record<number, boolean>>({});
    const [isFetchingMetadata, setIsFetchingMetadata] = useState<Record<number, boolean>>({}); // Add state for metadata fetching status

    // --- MOCK Eligibility Check Placeholders ---
    const check7DayStreak = useCallback(async (): Promise<boolean> => { await new Promise(resolve => setTimeout(resolve, 400)); return Math.random() > 0.3; }, []);
    const checkProfileComplete = useCallback(async (): Promise<boolean> => { await new Promise(resolve => setTimeout(resolve, 450)); return true; }, []); // Make this one always eligible for easier testing
    const checkFirstPost = useCallback(async (): Promise<boolean> => { await new Promise(resolve => setTimeout(resolve, 350)); return true; }, []);
    const checkFirstAppointment = useCallback(async (): Promise<boolean> => { await new Promise(resolve => setTimeout(resolve, 400)); return true; }, []);
    const checkFirstReading = useCallback(async (): Promise<boolean> => { await new Promise(resolve => setTimeout(resolve, 500)); return Math.random() > 0.6; }, []);

    // --- Define Available Milestones Configuration ---
    const MILESTONE_CONFIG: MilestoneBase[] = useMemo(() => [
        { id: 'profile-complete', contractName: 'Profile Powerhouse', description: 'Awarded for completing 100% of your user profile.', icon: User, eligibilityCheck: checkProfileComplete },
        { id: 'first-appointment', contractName: 'First Appointment Logged', description: 'Awarded for logging your first prenatal appointment.', icon: CalendarCheck, eligibilityCheck: checkFirstAppointment },
        { id: 'first-reading', contractName: 'Health Tracker Started', description: 'Awarded for logging your first health reading (BP, Sugar, or Weight).', icon: HeartPulse, eligibilityCheck: checkFirstReading },
        { id: '7-day-streak', contractName: '7-Day Logging Streak', description: 'Awarded for consistently logging health data for 7 consecutive days.', icon: Star, eligibilityCheck: check7DayStreak },
        { id: 'first-post', contractName: 'Community Starter', description: 'Awarded for making your first post in the community forum.', icon: Share2, eligibilityCheck: checkFirstPost },
    ], [check7DayStreak, checkProfileComplete, checkFirstPost, checkFirstAppointment, checkFirstReading]);

    // --- Network & Contract Setup ---
    const switchToMonadNetwork = useCallback(async (): Promise<boolean> => {
        if (!window.ethereum) { setContractError("MetaMask is not installed."); toast({ title: "MetaMask Required", variant: "destructive" }); return false; }
        setIsSwitchingNetwork(true); setContractError(null);
        const switchToast = toast({ title: "Requesting Network Switch..." });
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_CHAIN_ID }], });
          switchToast.update({ id: switchToast.id, title: "Network Switched!", description: `Now on ${MONAD_NETWORK_NAME}`, variant: "default" });
          setUserExplicitlyDisconnected(false);
          return true;
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            switchToast.update({ id: switchToast.id, title: "Network Not Found", description: `Adding ${MONAD_NETWORK_NAME}...` });
            try {
              await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [MONAD_NETWORK_PARAMS], });
              switchToast.update({ id: switchToast.id, title: "Network Added!", description: `Now on ${MONAD_NETWORK_NAME}`, variant: "default" });
              setUserExplicitlyDisconnected(false);
              return true;
            } catch (addError: any) {
              let message = "Failed to add Monad network."; if (addError.code === 4001) message = "Request rejected.";
              setContractError(message); switchToast.update({ id: switchToast.id, title: "Network Add Failed", description: message, variant: "destructive" }); return false;
            }
          } else {
            let message = "Failed to switch network."; if (switchError.code === 4001) message = "Request rejected.";
            setContractError(message); switchToast.update({ id: switchToast.id, title: "Network Switch Failed", description: message, variant: "destructive" }); return false;
          }
        } finally { setIsSwitchingNetwork(false); }
      }, [toast]);

    const checkNetwork = useCallback(async (currentProvider: BrowserProvider | null): Promise<boolean> => {
        if (!currentProvider) { setIsOnCorrectNetwork(false); setNetworkName(null); return false; }
        let isCorrect = false;
        try {
          const network = await currentProvider.getNetwork();
          const currentChainId = `0x${network.chainId.toString(16)}`;
          setNetworkName(network.name);
          isCorrect = currentChainId.toLowerCase() === MONAD_CHAIN_ID.toLowerCase();
          setIsOnCorrectNetwork(isCorrect);
          if(isCorrect) { setContractError(prev => prev?.includes("network") || prev?.includes("Switch") ? null : prev); }
          else { setContractError(`Please switch MetaMask to ${MONAD_NETWORK_NAME}. You are currently on ${network.name}.`); }
        } catch (err) { setContractError("Could not detect network."); setIsOnCorrectNetwork(false); setNetworkName(null); }
        return isCorrect;
      }, []);

    const setupEthers = useCallback(async (currentProvider: BrowserProvider, _currentAddress: string) => { // _currentAddress not needed here
         if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === 'YOUR_DEPLOYED_CONTRACT_ADDRESS_ON_MONAD') {
             setContractError("Contract address not configured."); return false;
         }
         try {
            const currentSigner = await currentProvider.getSigner();
            setSigner(currentSigner);
            const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentSigner);
            setContract(writeContract);
            const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentProvider);
            setReadOnlyContract(readContract);
            return true;
         } catch (error) { setContractError("Failed to initialize contract connection."); setSigner(null); setContract(null); setReadOnlyContract(null); return false; }
      }, []);

    const resetConnectionState = useCallback(() => {
        setIsConnected(false); setWalletAddress(null); setProvider(null); setSigner(null);
        setContract(null); setReadOnlyContract(null); setIsOnCorrectNetwork(false);
        setNetworkName(null); setAvailableMilestones([]); setUserBadges([]); setContractError(null);
        setIsEligible({}); setHasCheckedEligibility({});
    }, []);

    const disconnectWallet = useCallback(() => {
        resetConnectionState(); setUserExplicitlyDisconnected(true);
        toast({ title: "Wallet Disconnected (Mock)" });
    }, [resetConnectionState, toast]);

    const connectWallet = useCallback(async (triggeredByListener = false) => {
        if (isConnecting || isSwitchingNetwork || userExplicitlyDisconnected) return;
        setContractError(null); setIsConnecting(true);
        // For MOCK:
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockAddress = `0xMOCK...${Math.random().toString(16).substring(2, 6)}`;
        setWalletAddress(mockAddress); setIsConnected(true); setIsOnCorrectNetwork(true); setNetworkName(MONAD_NETWORK_NAME);
        toast({ title: "Wallet Connected (Mock)" }); setUserExplicitlyDisconnected(false);
        setUserBadges([ { tokenId: '101', milestoneTypeId: 1, name: 'Profile Powerhouse', date: new Date(Date.now() - 86400000 * 10), metadata: { name: "Mock Badge #101 - Profile Powerhouse", description: "Mock description.", attributes: [{trait_type: "Milestone", value: "Profile Powerhouse"}, {trait_type: "Mint Date", value: (Date.now() - 86400000 * 10)/1000, display_type: 'date'}] } }, { tokenId: '102', milestoneTypeId: 3, name: 'Health Tracker Started', date: new Date(Date.now() - 86400000 * 3), metadata: null }, ]);
        setIsConnecting(false);
        // END MOCK
      }, [toast, isConnecting, isSwitchingNetwork, userExplicitlyDisconnected, resetConnectionState]); // Removed checkNetwork, setupEthers for mock

    // --- Fetch Available Milestone Types (Mock) ---
    const fetchAvailableMilestones = useCallback(async () => {
        setIsLoadingMilestones(true); setContractError(null);
        const mockMilestones: Milestone[] = MILESTONE_CONFIG.map((cfg, index) => ({
            ...cfg, typeId: index + 1, name: cfg.contractName,
            description: cfg.description || `Achieve the '${cfg.contractName}' milestone.` // Use provided desc
        }));
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate fetch delay
        setAvailableMilestones(mockMilestones);
        setIsLoadingMilestones(false);
    }, [MILESTONE_CONFIG]);

    // --- Fetch User's Minted Badges (Mock) ---
    const fetchUserBadges = useCallback(async (_address: string | null, _currentProvider: ethers.BrowserProvider | null) => {
        if (!isConnected || !walletAddress) { setUserBadges([]); return; } // Use state variables
        setIsLoadingBadges(true);
        // Simulate fetching based on current mock badges
        await new Promise(resolve => setTimeout(resolve, 800));
        // No actual fetching needed, badges are set on connect/mint in mock
        setIsLoadingBadges(false);
    }, [isConnected, walletAddress]); // Depends on connection state

    // --- Check Eligibility Function ---
    const checkAndSetEligibility = useCallback(async (milestone: Milestone) => {
        const typeId = milestone.typeId;
        setHasCheckedEligibility(prev => ({ ...prev, [typeId]: true }));
        setIsEligible(prev => ({ ...prev, [typeId]: false }));
        setIsCheckingEligibility(prev => ({ ...prev, [typeId]: true }));
        try {
            const eligible = await milestone.eligibilityCheck(); // Call placeholder
            setIsEligible(prev => ({ ...prev, [typeId]: eligible }));
        } catch (err) {
            console.error(`Error checking eligibility for ${milestone.name}:`, err);
            setIsEligible(prev => ({ ...prev, [typeId]: false }));
            toast({ title: "Eligibility Check Failed", variant: "destructive" });
        } finally {
            setIsCheckingEligibility(prev => ({ ...prev, [typeId]: false }));
        }
    }, [toast]); // Removed unused deps

    // --- Minting Logic (Mock) ---
    const handleMintBadge = useCallback(async (milestone: Milestone) => {
        if (!isConnected) { toast({ title: "Connect Wallet First (Mock)" }); return; }
        if (!isEligible[milestone.typeId]) { toast({ title: "Not Eligible (Mock)" }); return; }

        const typeId = milestone.typeId;
        setIsMinting(prev => ({ ...prev, [typeId]: true }));
        setMintingError(prev => ({ ...prev, [typeId]: null }));
        setMintingSuccessTx(prev => ({ ...prev, [typeId]: null }));

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simulate success
        const mockTxHash = `0xmocktx${Math.random().toString(16).substring(2, 12)}`;
        const successMsg = `Success (Mock)! Tx: ${mockTxHash.substring(0, 10)}...`;
        setMintingSuccessTx(prev => ({ ...prev, [typeId]: successMsg }));
        toast({ title: "Milestone Badge Minted! (Mock)" });

        const newTokenId = (1000 + userBadges.length + Math.floor(Math.random()*1000)).toString();
        setUserBadges(prev => [...prev, {
            tokenId: newTokenId, milestoneTypeId: typeId, name: milestone.name, date: new Date(), metadata: null // Add with null metadata initially
        }]);
        setIsEligible(prev => ({ ...prev, [typeId]: false }));
        setHasCheckedEligibility(prev => ({ ...prev, [typeId]: false }));
        setIsMinting(prev => ({ ...prev, [typeId]: false }));

    }, [isConnected, toast, isEligible, userBadges.length]);

    // --- MOCK Fetch Token URI Data ---
    const fetchTokenMetadata = useCallback(async (badgeIndex: number) => {
        const badge = userBadges[badgeIndex];
        // Prevent fetch if already fetched OR currently fetching
        if (!badge || badge.metadata !== null || isFetchingMetadata[badgeIndex]) return;

        // Mark as fetching
        setIsFetchingMetadata(prev => ({ ...prev, [badgeIndex]: true }));


        await new Promise(resolve => setTimeout(resolve, 600));
        const mockJson = {
            name: `MomCare Badge #${badge.tokenId} - ${badge.name}`,
            description: `A non-transferable milestone badge awarded by MomCare AI for achieving: ${badge.name}. (Mock Data)`,
            attributes: [ { trait_type: "Milestone", value: badge.name }, { trait_type: "Milestone Type ID", value: badge.milestoneTypeId }, { trait_type: "Mint Date", value: badge.date.getTime() / 1000, display_type: "date" }, ],
        };
        setUserBadges(currentBadges => currentBadges.map((b, index) => index === badgeIndex ? { ...b, metadata: mockJson } : b ));

        // Mark as done fetching (important!) - Consider removing if setUserBadges triggers the effect correctly
        // setIsFetchingMetadata(prev => ({ ...prev, [badgeIndex]: false })); // Let's remove this first, the effect dependency might handle it

    }, [userBadges, isFetchingMetadata]);

    // --- Effects ---
    useEffect(() => {
        const init = async () => {
            // Only attempt auto-connect if not already connected
            if (!isConnected && !userExplicitlyDisconnected && window.ethereum?.selectedAddress && window.ethereum.isConnected()) {
                await connectWallet(true);
            }
        };
        init();
        // Add isConnected to dependencies
    }, [isConnected, userExplicitlyDisconnected, connectWallet]);
    useEffect(() => { fetchAvailableMilestones(); }, [fetchAvailableMilestones]); // Fetch milestones on mount/config change
    useEffect(() => { if (isConnected && walletAddress) { fetchUserBadges(walletAddress, provider); } else { setUserBadges([]); } }, [isConnected, walletAddress, provider, fetchUserBadges]); // Fetch badges on connection
    useEffect(() => {
        userBadges.forEach((badge, index) => {
            // Only attempt fetch if metadata is null and not currently fetching
            if (badge.metadata === null && !isFetchingMetadata[index]) {
                fetchTokenMetadata(index);
            }
        });
        // Dependencies: userBadges array reference, fetchTokenMetadata function, isFetchingMetadata state
    }, [userBadges, fetchTokenMetadata, isFetchingMetadata]);

    // --- Render ---
    return (
        <MainLayout requireAuth={true}>
             <TooltipProvider>
                <div className="container mx-auto max-w-6xl py-8 md:py-12 px-4">
                    {/* Header */}
                    <div className="text-center mb-8 md:mb-12">
                         <h1 className="text-3xl md:text-4xl font-bold text-momcare-primary dark:text-momcare-light tracking-tight">
                             MomCare AI Milestones on Monad
                         </h1>
                         <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                             Celebrate your journey! Mint unique, non-transferable NFT badges on the Monad Testnet for achieving key milestones within the app.
                         </p>
                          <Alert variant="default" className="mt-6 max-w-xl mx-auto text-left bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            <AlertTitle className="font-semibold">Hackathon Submission Notice</AlertTitle>
                            <AlertDescription className="text-sm">
                                Due to time constraints and testnet availability at submission time, the Monad blockchain interactions on this page are currently <b>mocked</b> to demonstrate the intended UI flow. The smart contract code (`MomCareMilestoneNFT.sol`) is complete and included in the submission (`/contracts` folder).
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Wallet Connection Card */}
                    <Card className="mb-8 shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl font-semibold dark:text-gray-200">
                                <Wallet className="mr-2 h-6 w-6 text-momcare-secondary dark:text-blue-400" />
                                Monad Wallet Connection (Mocked)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-grow text-sm space-y-1">
                                {isConnected && walletAddress ? (
                                    <>
                                        <p className="flex items-center text-green-600 dark:text-green-400 font-medium"><CheckCircle className="h-4 w-4 mr-1.5" /> Connected (Mock)</p>
                                        <p className="text-gray-700 dark:text-gray-300">Address: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs break-all">{shortenAddress(walletAddress)}</span></p>
                                        <p className="text-gray-500 dark:text-gray-400">Network: <span className="font-medium text-green-600 dark:text-green-400">{networkName || 'Monad Testnet (Mocked)'}</span></p>
                                    </>
                                ) : ( <p className="text-gray-500 dark:text-gray-400">Wallet not connected.</p> )}
                            </div>
                            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                {!isConnected ? ( <Button onClick={() => connectWallet()} disabled={isConnecting} className="w-full sm:w-auto"> {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : <> <Wallet className="mr-2 h-4 w-4" /> Connect Wallet (Mock)</>} </Button> )
                                : ( <Button variant="outline" size="sm" onClick={disconnectWallet} className="w-full sm:w-auto"> <LogOut className="mr-2 h-4 w-4"/> Disconnect </Button> )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* General Contract/Network Error Display */}
                    {contractError && ( <Alert variant="destructive" className="mb-6"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{contractError}</AlertDescription> </Alert> )}

                    {/* --- Main Content Area with Tabs --- */}
                    <Tabs defaultValue="available" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="available">Available Milestones</TabsTrigger>
                            <TabsTrigger value="my-badges">Your Minted Badges ({userBadges.length})</TabsTrigger>
                        </TabsList>

                        {/* Available Milestones Tab */}
                        <TabsContent value="available">
                             <div className="space-y-6">
                                 {isLoadingMilestones ? (
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Skeleton className="h-52 w-full dark:bg-gray-700 rounded-lg" />
                                        <Skeleton className="h-52 w-full dark:bg-gray-700 rounded-lg" />
                                        <Skeleton className="h-52 w-full dark:bg-gray-700 rounded-lg" />
                                     </div>
                                 ) : !isConnected ? (
                                     <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">Please connect your wallet to view available milestones.</p>
                                 ) : availableMilestones.length === 0 && !contractError ? (
                                     <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">No milestone types currently available.</p>
                                 ) : availableMilestones.length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {availableMilestones.map((milestone) => {
                                            const userEligible = isEligible[milestone.typeId] ?? false;
                                            const eligibilityChecked = hasCheckedEligibility[milestone.typeId] ?? false;
                                            const checkingEligibility = isCheckingEligibility[milestone.typeId] ?? false;
                                            const isCurrentlyMinting = isMinting[milestone.typeId] ?? false;
                                            const errorForThis = mintingError[milestone.typeId];
                                            const successTxForThis = mintingSuccessTx[milestone.typeId];
                                            const hasMintedThis = userBadges.some(b => b.milestoneTypeId === milestone.typeId);
                                            const canMint = isConnected && !hasMintedThis && userEligible;
                                            const Icon = milestone.icon; // Get icon component

                                            return (
                                                <Card key={milestone.typeId} className={`shadow-md border dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col transition-opacity duration-300 ${hasMintedThis ? 'opacity-60' : 'opacity-100'} hover:shadow-lg`}>
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="flex items-center text-base font-semibold dark:text-gray-200">
                                                             <Icon className={`mr-2 h-5 w-5 flex-shrink-0 ${hasMintedThis ? 'text-green-500' : 'text-momcare-primary dark:text-momcare-accent'}`} />
                                                             {milestone.name}
                                                        </CardTitle>
                                                        <CardDescription className="dark:text-gray-400 pt-1 text-xs">{milestone.description}</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow flex flex-col justify-end space-y-2 pt-1">
                                                        {/* Eligibility Check Button */}
                                                        {!hasMintedThis && (
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => checkAndSetEligibility(milestone)}
                                                                disabled={!isConnected || eligibilityChecked || isCurrentlyMinting || checkingEligibility}
                                                                className={`text-xs w-full ${
                                                                    eligibilityChecked && userEligible ? 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/30' :
                                                                    eligibilityChecked && !userEligible ? 'border-red-500 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/30' :
                                                                    'dark:text-gray-300 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                {checkingEligibility ? <Loader2 className='h-3 w-3 mr-1 animate-spin'/> : null}
                                                                {eligibilityChecked ? (userEligible ? 'Eligible!' : 'Not Eligible Yet') : 'Check Eligibility'}
                                                            </Button>
                                                        )}
                                                        {/* Mint Button */}
                                                        <Button
                                                            onClick={() => handleMintBadge(milestone)}
                                                            disabled={isCurrentlyMinting || !canMint || !isConnected}
                                                            className="w-full bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-accent dark:hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={hasMintedThis ? "Badge already minted" : !isConnected ? "Connect wallet" : !eligibilityChecked ? "Check eligibility first" : !userEligible ? "Criteria not met" : "Mint this badge (Mock)"}
                                                        >
                                                            {isCurrentlyMinting ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Minting (Mock)...</> )
                                                            : hasMintedThis ? ( <><CheckCircle className="mr-2 h-4 w-4" /> Minted</> )
                                                            : ( "Mint Badge (Mock)" )}
                                                        </Button>
                                                    </CardContent>
                                                     <CardFooter className="pt-2 pb-3 px-4 h-6"> {/* Footer for status */}
                                                         {errorForThis && <p className="text-red-500 dark:text-red-400 text-xs truncate" title={errorForThis}>{errorForThis}</p>}
                                                         {successTxForThis && !errorForThis && <p className="text-green-600 dark:text-green-400 text-xs truncate" title={successTxForThis}>{successTxForThis}</p>}
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                 ) : null }
                             </div>
                        </TabsContent>

                        {/* Your Minted Badges Tab */}
                        <TabsContent value="my-badges">
                             <div className="space-y-4">
                                 {isLoadingBadges ? (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Skeleton className="h-24 w-full dark:bg-gray-700 rounded-lg" />
                                        <Skeleton className="h-24 w-full dark:bg-gray-700 rounded-lg" />
                                     </div>
                                 ) : !isConnected ? (
                                      <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">Connect your wallet to view your badges.</p>
                                 ) : userBadges.length > 0 ? (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {userBadges.sort((a,b) => b.date.getTime() - a.date.getTime()).map((badge, index) => ( // Pass index
                                            <Card key={badge.tokenId} className="bg-gradient-to-br from-purple-100 via-pink-50 to-blue-50 dark:from-gray-700 dark:via-gray-700/80 dark:to-gray-800 border border-purple-200 dark:border-gray-600 p-4 shadow hover:shadow-lg transition-shadow">
                                                <div className="flex items-start space-x-4">
                                                     <BadgeCheck className="h-10 w-10 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                                                     <div className="flex-grow overflow-hidden">
                                                        <p className="font-semibold text-base text-purple-800 dark:text-purple-200 truncate" title={badge.name}>{badge.name}</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Minted: {format(badge.date, 'MMM d, yyyy, h:mm a')}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Token ID: <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-[10px]">{badge.tokenId} (Mock)</span></p>
                                                        {/* Display Mock Metadata with Tooltip */}
                                                        <TooltipProvider delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={() => fetchTokenMetadata(index)} // Use index
                                                                        disabled={!!badge.metadata} // Disable if already loaded
                                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5 flex items-center disabled:opacity-50 disabled:no-underline"
                                                                    >
                                                                        {badge.metadata === undefined ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : null} {/* Show loader only while fetching */}
                                                                        {badge.metadata ? 'View Details' : 'Load Details'} <Info className="h-3 w-3 ml-1"/>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs text-xs bg-black text-white p-2 rounded shadow-lg">
                                                                    {badge.metadata ? (
                                                                        <>
                                                                            <p><strong>Name:</strong> {badge.metadata.name || 'N/A'}</p>
                                                                            <p><strong>Desc:</strong> {badge.metadata.description || 'N/A'}</p>
                                                                            {badge.metadata.attributes && badge.metadata.attributes.length > 0 && (
                                                                                <div className="mt-1 pt-1 border-t border-gray-600">
                                                                                    <strong>Attributes:</strong>
                                                                                    <ul className="list-disc list-inside">
                                                                                        {badge.metadata.attributes.map(attr => (
                                                                                            <li key={attr.trait_type}>{attr.trait_type}: {attr.display_type === 'date' && typeof attr.value === 'number' ? format(new Date(attr.value * 1000), 'PPp') : attr.value}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <p>Click "Load Details" to view metadata.</p>
                                                                    )}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                     </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                 ) : (
                                      <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">You haven't minted any milestone badges yet.</p>
                                 )}
                             </div>
                        </TabsContent>
                    </Tabs>
                 </div> {/* End Container */}
             </TooltipProvider>
         </MainLayout>
    );
};

export default MonadPage;