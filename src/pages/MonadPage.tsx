// src/pages/MonadPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    ethers,
    Contract,
    BrowserProvider,
    Signer, // Keep Signer type for clarity
    BigNumberish,
    TransactionResponse,
    TransactionReceipt,
    // Log, // Log type might not be needed if only parsing specific events
    Interface // Import Interface for parsing logs
} from 'ethers';
import { format, subDays } from 'date-fns';
import { Buffer } from 'buffer'; // Keep for base64 decoding of tokenURI

// --- UI Imports ---
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress"; // Keep progress for tx status
import {
    Loader2, AlertTriangle, CheckCircle, BadgeCheck, Wallet, LinkIcon, RefreshCw,
    Network, LogOut, ExternalLink, Info, Sparkles, CalendarCheck, HeartPulse, Share2, User, Star, Image as ImageIcon, XCircle, HelpCircle,FileUp, MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

// --- Appwrite Imports ---
// Remove Appwrite storage imports if only used for Gemini images
import {
    // getFilePreview, // Remove if only used for Gemini images
    // generatedImageBucketId, // Remove if only used for Gemini images
    // --- Import necessary Appwrite data fetching functions for Eligibility ---
    // !! YOU NEED TO IMPLEMENT THESE OR SIMILAR FUNCTIONS IN appwrite.ts !!
    getUserProfile,
    getForumPosts,
    getUserAppointments,
    getBloodPressureReadings,
    getBloodSugarReadings,
    getWeightReadings,
    UserProfile,
    Query
} from '@/lib/appwrite';
// --- Remove Gemini Imports ---
// import { generateMilestoneImageAndUpload } from '@/lib/gemini';
import type { Models as AppwriteModels } from 'appwrite'; // Keep if needed elsewhere

// --- Contract Configuration ---
const CONTRACT_ADDRESS = '0xF5a2be3e8b6244Cd8c7d5f5E1097ab8980808cdb';
const CONTRACT_ABI = [ // PASTE THE FULL, CORRECT ABI
    {"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"owner","type":"address"}],"name":"ERC721IncorrectOwner","type":"error"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ERC721InsufficientApproval","type":"error"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC721InvalidApprover","type":"error"},{"inputs":[{"internalType":"address","name":"operator","type":"address"}],"name":"ERC721InvalidOperator","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"ERC721InvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC721InvalidReceiver","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC721InvalidSender","type":"error"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ERC721NonexistentToken","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":true,"internalType":"uint256","name":"milestoneTypeId","type":"uint256"},{"indexed":false,"internalType":"string","name":"milestoneName","type":"string"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mintDate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"level","type":"uint256"}],"name":"MilestoneMinted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"typeId","type":"uint256"},{"indexed":false,"internalType":"string","name":"name","type":"string"}],"name":"MilestoneTypeAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"typeId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"MilestoneTypeEnabled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"typeId","type":"uint256"},{"indexed":false,"internalType":"string","name":"newName","type":"string"}],"name":"MilestoneTypeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"string","name":"imageURI","type":"string"}],"name":"TokenImageURISet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"addMilestoneType","outputs":[{"internalType":"uint256","name":"typeId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_recipients","type":"address[]"},{"internalType":"uint256[]","name":"_milestoneTypeIds","type":"uint256[]"},{"internalType":"uint256[]","name":"_levels","type":"uint256[]"}],"name":"batchMintMilestones","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"getMilestoneInfo","outputs":[{"components":[{"internalType":"uint256","name":"milestoneTypeId","type":"uint256"},{"internalType":"uint256","name":"mintDate","type":"uint256"},{"internalType":"uint256","name":"level","type":"uint256"}],"internalType":"struct MomCareMilestoneNFT.MilestoneInfo","name":"info","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMilestoneTypeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_typeId","type":"uint256"}],"name":"getMilestoneTypeInfo","outputs":[{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"bool","name":"enabled","type":"bool"}],"internalType":"struct MomCareMilestoneNFT.MilestoneTypeInfo","name":"info","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"getTokenImageURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_milestoneTypeId","type":"uint256"}],"name":"getUserMilestoneLevel","outputs":[{"internalType":"uint256","name":"level","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserOwnedTokens","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"milestoneData","outputs":[{"internalType":"uint256","name":"milestoneTypeId","type":"uint256"},{"internalType":"uint256","name":"mintDate","type":"uint256"},{"internalType":"uint256","name":"level","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"milestoneTypes","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"bool","name":"enabled","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_milestoneTypeId","type":"uint256"},{"internalType":"uint256","name":"_level","type":"uint256"}],"name":"mintMilestoneBadge","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"baseURI_","type":"string"}],"name":"setBaseURI","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_typeId","type":"uint256"},{"internalType":"bool","name":"_enabled","type":"bool"}],"name":"setMilestoneTypeEnabled","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"},{"internalType":"string","name":"_imageURI","type":"string"}],"name":"setTokenImageURI","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_typeId","type":"uint256"},{"internalType":"string","name":"_newName","type":"string"}],"name":"updateMilestoneTypeName","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userOwnedTokenIds","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

// --- Monad Network Details ---
const MONAD_CHAIN_ID = '0x279f';
const MONAD_NETWORK_NAME = 'Monad Testnet';
const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
const MONAD_CURRENCY_SYMBOL = 'MON';
const MONAD_CURRENCY_DECIMALS = 18;
const MONAD_BLOCK_EXPLORER_URL = 'https://testnet.monadexplorer.com';

const MONAD_NETWORK_PARAMS = {
  chainId: MONAD_CHAIN_ID,
  chainName: MONAD_NETWORK_NAME,
  nativeCurrency: { name: MONAD_NETWORK_NAME, symbol: MONAD_CURRENCY_SYMBOL, decimals: MONAD_CURRENCY_DECIMALS },
  rpcUrls: [MONAD_RPC_URL],
  blockExplorerUrls: [MONAD_BLOCK_EXPLORER_URL],
};

// --- Types ---
interface MilestoneDefinition {
    id: string;
    description: string;
    icon: React.ElementType;
    eligibilityCheck: (userId: string, currentLevel: number) => Promise<boolean>;
    targetLevel: number;
}

interface AvailableMilestone {
    typeId: number;
    name: string;
    description: string;
    icon: React.ElementType;
    eligibilityCheck: (userId: string, currentLevel: number) => Promise<boolean>;
    targetLevel: number;
    enabled: boolean;
}

interface MintedBadge {
    tokenId: string;
    milestoneTypeId: number;
    name: string;
    level: number;
    date: Date;
    // imageUrl?: string | null; // Removed - rely on metadata or contract URI
    metadata?: {
        name?: string;
        description?: string;
        image?: string; // Image from metadata (fetched from tokenURI)
        attributes?: { trait_type: string; value: string | number; display_type?: string }[];
    } | null;
    // Add state for image fetched directly from contract if needed
    contractImageUrl?: string | null;
}

// --- Helper Functions ---
const shortenAddress = (address: string | undefined | null): string => {
  if (!address) return '...';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const getContractErrorMessage = (error: any): string => {
    // console.debug("Parsing error:", error);
    if (error?.code === 'ACTION_REJECTED') return 'Transaction rejected by user.';
    if (error?.info?.error?.message) return error.info.error.message;
    if (error?.data) {
        try {
            const iface = new Interface(CONTRACT_ABI);
            const decodedError = iface.parseError(error.data);
            if (decodedError) return `${decodedError.name}(${decodedError.args.join(', ')})`;
        } catch { /* ignore decode error */ }
        return `Reverted with reason: ${error.data}`;
    }
    if (error?.data?.message) return error.data.message;
    if (error?.reason) return error.reason;
    if (error?.message) {
        let msg = error.message;
        const prefixes = ["execution reverted: ", "Error: ", "Internal JSON-RPC error."];
        for (const prefix of prefixes) {
            if (msg.startsWith(prefix)) {
                msg = msg.substring(prefix.length);
                 try { const nested = JSON.parse(msg); if (nested?.message) msg = nested.message; } catch { /* ignore */ }
                 break;
            }
        }
        return msg;
    }
    return "An unknown contract error occurred.";
};


// --- Main Page Component ---
const MonadPage: React.FC = () => {
    // --- State ---
    const { user: appwriteUser } = useAuthStore();
    const { toast } = useToast();

    // Web3 Connection State
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
    const [networkName, setNetworkName] = useState<string | null>(null);
    const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean>(false);
    const [userExplicitlyDisconnected, setUserExplicitlyDisconnected] = useState<boolean>(false);
    const [web3Error, setWeb3Error] = useState<string | null>(null);

    // Contract Interaction State
    const [contract, setContract] = useState<Contract | null>(null);
    const [readOnlyContract, setReadOnlyContract] = useState<Contract | null>(null);

    // Milestone & Badge State
    const [availableMilestones, setAvailableMilestones] = useState<AvailableMilestone[]>([]);
    const [isLoadingMilestones, setIsLoadingMilestones] = useState<boolean>(false);
    const [userBadges, setUserBadges] = useState<MintedBadge[]>([]);
    const [isLoadingBadges, setIsLoadingBadges] = useState<boolean>(false);

    // Action States (per milestone type ID)
    const [isCheckingEligibility, setIsCheckingEligibility] = useState<Record<number, boolean>>({});
    const [isEligible, setIsEligible] = useState<Record<number, boolean>>({});
    const [isMinting, setIsMinting] = useState<Record<number, boolean>>({});
    // Removed Gemini-specific progress/status
    // const [mintingProgress, setMintingProgress] = useState<Record<number, number>>({});
    // const [mintingStatusText, setMintingStatusText] = useState<Record<number, string>>({});
    const [mintingError, setMintingError] = useState<Record<number, string | null>>({});
    const [mintingSuccessTx, setMintingSuccessTx] = useState<Record<number, string | null>>({});
    const [isFetchingMetadata, setIsFetchingMetadata] = useState<Record<string, boolean>>({}); // tokenId key

    // Refs for preventing race conditions
    const isFetchingMilestonesRef = useRef(false);
    const isFetchingBadgesRef = useRef(false);

    // --- Eligibility Check Implementations ---
    // IMPORTANT: Replace MOCK logic with actual Appwrite/backend calls
    const checkProfileComplete = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
        if (currentLevel >= 1) return false;
        /*console.log(`Checking Profile Complete eligibility for user ${userId}`);*/
        try {
            const profile = await getUserProfile(userId);
            if (!profile) return false;
            const requiredFields: (keyof UserProfile)[] = ['name', 'age', 'gender', 'weeksPregnant', 'activityLevel', 'deliveryPreference'];
            const isComplete = requiredFields.every(field => profile[field] != null && String(profile[field]).trim() !== '');
            /*console.log(`Profile Complete check result: ${isComplete}`);*/
            return isComplete;
        } catch (error) { console.error("Error checking profile completeness:", error); return false; }
    }, []);

    const checkFirstPost = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
        if (currentLevel >= 1) return false;
        /*console.log(`Checking First Post eligibility for user ${userId}`);*/
        try {
            // Assuming getForumPosts can check if *any* post exists for the user
            // This might need adjustment based on your appwrite.ts implementation
            const userPosts = await getForumPosts(userId, 1); // Fetch limit 1 for existence check
            const hasPosted = userPosts.total > 0;
            /*console.log(`First Post check result: ${hasPosted}`);*/
            return hasPosted;
        } catch (error: any) { /*console.error("Error checking first post:", error);*/ return false; }
    }, []);

    const checkFirstAppointment = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
         if (currentLevel >= 1) return false;
         /*console.log(`Checking First Appointment eligibility for user ${userId}`);*/
         try {
            const appointments = await getUserAppointments(userId);
            const hasAppointments = appointments.length > 0;
            /*console.log(`First Appointment check result: ${hasAppointments}`);*/
            return hasAppointments;
         } catch (error: any) { /*console.error("Error checking first appointment:", error);*/ return false; }
    }, []);

    const checkFirstReading = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
         if (currentLevel >= 1) return false;
         /*console.log(`Checking First Reading eligibility for user ${userId}`);*/
         try {
            const [bp, sugar, weight] = await Promise.all([
                getBloodPressureReadings(userId, 1), getBloodSugarReadings(userId, 1), getWeightReadings(userId, 1)
            ]);
            const hasReading = bp.length > 0 || sugar.length > 0 || weight.length > 0;
            /*console.log(`First Reading check result: ${hasReading}`);*/
            return hasReading;
         } catch (error: any) { /*console.error("Error checking first reading:", error);*/ return false; }
    }, []);

    const check7DayStreak = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
        if (currentLevel >= 1) return false;
        console.log(`MOCK: Checking 7-Day Streak eligibility for user ${userId}`);
        // --- Replace MOCK with actual Appwrite logic ---
        // Fetch BP, Sugar, Weight readings for the last ~8 days
        // Group by date, check for 7 consecutive days
        await new Promise(resolve => setTimeout(resolve, 300));
        const hasStreak = Math.random() > 0.7;
        console.log(`7-Day Streak check result: ${hasStreak}`);
        return hasStreak;
    }, []);
    // Placeholder for First Trimester Check
    const checkFirstTrimester = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
        if (currentLevel >= 1) return false;
        console.log(`MOCK: Checking First Trimester eligibility for user ${userId}`);
        // --- Replace MOCK with actual Appwrite/backend logic ---
        // e.g., check user profile's weeksPregnant against 13 weeks
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async check
        return false; // Implement actual logic
    }, []);

    // Placeholder for First Medical Doc Upload Check
    const checkFirstDocUpload = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
        if (currentLevel >= 1) return false;
        console.log(`MOCK: Checking First Doc Upload eligibility for user ${userId}`);
        // --- Replace MOCK with actual Appwrite/backend logic ---
        // e.g., check if user has uploaded any documents to a specific bucket/collection
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async check
        return false; // Implement actual logic
    }, []);

    // Placeholder for First AI Chat Interaction Check
    const checkFirstAIChat = useCallback(async (userId: string, currentLevel: number): Promise<boolean> => {
        if (currentLevel >= 1) return false;
        console.log(`MOCK: Checking First AI Chat eligibility for user ${userId}`);
        // --- Replace MOCK with actual Appwrite/backend logic ---
        // e.g., check if user has any messages in the AI chat history
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async check
        return false; // Implement actual logic
    }, []);
    // --- End Eligibility Implementations ---

    // --- Frontend Milestone Definitions ---
    // !! ENSURE THIS ORDER MATCHES THE ORDER addMilestoneType WAS CALLED ON-CHAIN !!
    const MILESTONE_DEFINITIONS: MilestoneDefinition[] = useMemo(() => [
        // Existing definitions (IDs 1-5)
        { id: 'profile-complete', targetLevel: 1, description: 'Awarded for completing required profile fields.', icon: User, eligibilityCheck: checkProfileComplete },
        { id: 'first-appointment', targetLevel: 1, description: 'Awarded for logging your first prenatal appointment.', icon: CalendarCheck, eligibilityCheck: checkFirstAppointment },
        { id: 'first-reading', targetLevel: 1, description: 'Awarded for logging your first health reading.', icon: HeartPulse, eligibilityCheck: checkFirstReading },
        { id: '7-day-streak', targetLevel: 1, description: 'Awarded for logging health data for 7 consecutive days.', icon: Star, eligibilityCheck: check7DayStreak },
        { id: 'first-post', targetLevel: 1, description: 'Awarded for making your first post in the forum.', icon: Share2, eligibilityCheck: checkFirstPost },
        // Added definitions (IDs 6-8) based on Python script
        { id: 'first-trimester', targetLevel: 1, description: 'Awarded for completing the first trimester.', icon: CheckCircle, eligibilityCheck: checkFirstTrimester },
        { id: 'first-doc-upload', targetLevel: 1, description: 'Awarded for uploading your first medical document.', icon: FileUp, eligibilityCheck: checkFirstDocUpload },
        { id: 'first-ai-chat', targetLevel: 1, description: 'Awarded for your first interaction with the AI chat.', icon: MessageSquare, eligibilityCheck: checkFirstAIChat },
        // Add more definitions here if needed, ensuring targetLevel and eligibilityCheck are correct
    ], [
        checkProfileComplete, checkFirstAppointment, checkFirstReading, check7DayStreak, checkFirstPost,
        checkFirstTrimester, checkFirstDocUpload, checkFirstAIChat // <-- Add new check functions to dependency array
    ]);

    // --- Web3 Connection Logic (Callbacks defined earlier) ---
    const checkNetwork = useCallback(async (currentProvider: BrowserProvider | null): Promise<boolean> => {
        if (!currentProvider) { setIsOnCorrectNetwork(false); setNetworkName(null); return false; }
        try {
            const network = await currentProvider.getNetwork();
            const currentChainId = `0x${network.chainId.toString(16)}`;
            const isCorrect = currentChainId.toLowerCase() === MONAD_CHAIN_ID.toLowerCase();
            setIsOnCorrectNetwork(isCorrect);
            // --- Modification Start ---
            // Determine the display name, forcing MONAD_NETWORK_NAME if the network is correct but name is missing/unknown
            let displayedName = network.name;
            if (isCorrect && (!displayedName || displayedName.toLowerCase() === 'unknown')) {
                displayedName = MONAD_NETWORK_NAME; // Use the constant if correct network but name is missing/unknown
            } else if (!displayedName) {
                displayedName = `Chain ID ${currentChainId}`; // Fallback if name is missing on incorrect network
            }
            setNetworkName(displayedName);
            // --- Modification End ---
            if (isCorrect) setWeb3Error(prev => (prev?.includes("Incorrect Network") ? null : prev));
            else setWeb3Error(`Incorrect Network: Please switch MetaMask to ${MONAD_NETWORK_NAME}. You are on ${displayedName}.`); // Use displayedName here too
            console.log(`Network Check: ${displayedName} (${currentChainId}). Correct: ${isCorrect}`);
            return isCorrect;
        } catch (err) {
            console.error("Could not detect network:", err); setWeb3Error("Could not detect network.");
            setIsOnCorrectNetwork(false); setNetworkName(null); return false;
        }
    }, []);

    const setupEthers = useCallback(async (currentProvider: BrowserProvider): Promise<boolean> => {
        setWeb3Error(null);
        if (!CONTRACT_ADDRESS) { setWeb3Error("Contract address missing."); return false; }
        if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) { setWeb3Error("Contract ABI missing."); return false; }
        try {
            const currentSigner = await currentProvider.getSigner();
            const userAddress = await currentSigner.getAddress();
            const contractInterface = new Interface(CONTRACT_ABI);
            const writeContractInstance = new Contract(CONTRACT_ADDRESS, contractInterface, currentSigner);
            const readContractInstance = new Contract(CONTRACT_ADDRESS, contractInterface, currentProvider);
            setSigner(currentSigner); setWalletAddress(userAddress); setContract(writeContractInstance);
            setReadOnlyContract(readContractInstance); setIsConnected(true); setUserExplicitlyDisconnected(false);
            console.log("Ethers setup complete:", userAddress);
            return true;
        } catch (error: any) {
            console.error("Ethers setup error:", error); setWeb3Error(`Contract connection failed: ${getContractErrorMessage(error)}`);
            setSigner(null); setWalletAddress(null); setContract(null); setReadOnlyContract(null); setIsConnected(false); return false;
        }
    }, []); // ABI is constant

    const resetConnectionState = useCallback(() => {
        setIsConnected(false); setWalletAddress(null); setProvider(null); setSigner(null);
        setContract(null); setReadOnlyContract(null); setIsOnCorrectNetwork(false);
        setNetworkName(null); setAvailableMilestones([]); setUserBadges([]);
        setWeb3Error(null); setIsEligible({});
    }, []);

    const connectWallet = useCallback(async () => {
        if (isConnecting || isSwitchingNetwork) return;
        if (typeof window.ethereum === 'undefined') {
            setWeb3Error("MetaMask not installed."); toast({ title: "Wallet Not Found", variant: "destructive" });
            setIsConnecting(false); return;
        }
        setWeb3Error(null); setIsConnecting(true);
        toast({ title: "Connecting Wallet..." });
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
            if (!accounts || accounts.length === 0) throw new Error("No accounts found.");
            const browserProvider = new ethers.BrowserProvider(window.ethereum, 'any');
            setProvider(browserProvider);
            const isCorrectNet = await checkNetwork(browserProvider);
            if (isCorrectNet) {
                if (await setupEthers(browserProvider)) toast({ title: "Wallet Connected!", variant: 'default' });
                else toast({ title: "Connection Issue", description: web3Error || "Setup failed.", variant: "destructive" });
            } else {
                toast({ title: "Incorrect Network", description: `Switch to ${MONAD_NETWORK_NAME}.`, variant: "destructive" });
                setSigner(null); setWalletAddress(accounts[0]); setContract(null);
                setReadOnlyContract(null); setIsConnected(true); // Still connected, but wrong network
            }
        } catch (error: any) {
            const message = getContractErrorMessage(error); // Use helper for better messages
            setWeb3Error(message); toast({ title: "Connection Failed", description: message, variant: "destructive" });
            resetConnectionState();
        } finally { setIsConnecting(false); }
    }, [isConnecting, isSwitchingNetwork, checkNetwork, setupEthers, resetConnectionState, toast, web3Error]);

    const handleAccountsChanged = useCallback((accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) { toast({ title: "Wallet disconnected.", variant: 'default' }); resetConnectionState(); setUserExplicitlyDisconnected(true); }
        else { toast({ title: "Account switched.", variant: 'default' }); resetConnectionState(); connectWallet(); }
    }, [resetConnectionState, connectWallet, toast]);

    const handleChainChanged = useCallback((chainId: string) => {
        console.log('Chain changed:', chainId); toast({ title: `Network changed. Re-validating...`, variant: 'default' });
        setContract(null); setReadOnlyContract(null); // Reset contracts
        if (provider) checkNetwork(provider).then(isCorrect => { if (isCorrect && provider) setupEthers(provider); });
        else resetConnectionState();
    }, [provider, checkNetwork, setupEthers, resetConnectionState, toast]);

    const disconnectWallet = useCallback(() => {
        console.log("Disconnecting..."); resetConnectionState(); setUserExplicitlyDisconnected(true);
        toast({ title: "Wallet Disconnected", variant: 'default' });
        if (window.ethereum?.removeListener) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
    }, [resetConnectionState, toast, handleAccountsChanged, handleChainChanged]);

    const switchToMonadNetwork = useCallback(async (): Promise<boolean> => {
        if (!window.ethereum) { setWeb3Error("MetaMask not installed."); toast({ title: "Wallet Not Found", variant: "destructive" }); return false; }
        setIsSwitchingNetwork(true); setWeb3Error(null);
        const { id: toastId, update: updateToast } = toast({ title: "Requesting Network Switch..." });
        try {
            await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_CHAIN_ID }], });
            updateToast({ title: `Switched to ${MONAD_NETWORK_NAME}`, variant: 'default', id: toastId });
            await new Promise(r => setTimeout(r, 500)); if (provider) await checkNetwork(provider); return true;
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                updateToast({ title: `Adding ${MONAD_NETWORK_NAME}...`, variant: 'default', id: toastId });
                try {
                    await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [MONAD_NETWORK_PARAMS], });
                    updateToast({ title: `Added ${MONAD_NETWORK_NAME}!`, description:"Switch manually if needed.", variant: 'default', id: toastId });
                    await new Promise(r => setTimeout(r, 500)); if (provider) await checkNetwork(provider); return true;
                } catch (addError: any) {
                    const msg = getContractErrorMessage(addError); setWeb3Error(msg);
                    updateToast({ title: "Network Add Failed", description: msg, variant: "destructive", id: toastId }); return false;
                }
            } else {
                const msg = getContractErrorMessage(switchError); setWeb3Error(msg);
                updateToast({ title: "Network Switch Failed", description: msg, variant: "destructive", id: toastId }); return false;
            }
        } finally { setIsSwitchingNetwork(false); }
    }, [toast, provider, checkNetwork]);

    // --- Contract Interaction Logic ---

    const fetchAvailableMilestones = useCallback(async () => {
        if (!readOnlyContract || !isConnected || isFetchingMilestonesRef.current) return;
        setIsLoadingMilestones(true); isFetchingMilestonesRef.current = true; setWeb3Error(null);
        const fetched: AvailableMilestone[] = [];
        try {
            const count = Number(await readOnlyContract.getMilestoneTypeCount());
            if (count === 0) { setAvailableMilestones([]); return; } // Handle no types case

            // Fetch all type infos efficiently
            const typeInfoPromises = Array.from({ length: count }, (_, i) =>
                readOnlyContract.getMilestoneTypeInfo(i + 1).catch(e => { // Add catch here
                    console.error(`Error fetching type info for ID ${i + 1}:`, e);
                    return null; // Return null on error for this specific type
                })
            );
            const typeInfosResults = await Promise.all(typeInfoPromises);

            typeInfosResults.forEach((typeInfo, index) => {
                const typeId = index + 1;
                if (typeInfo && typeInfo.exists) { // Check if result is not null and exists
                    // Match definition by index (assuming order) - robust matching needed if IDs aren't sequential/matching index
                    const definition = MILESTONE_DEFINITIONS[typeId - 1];
                    if (definition) {
                        fetched.push({
                            typeId, name: typeInfo.name, enabled: typeInfo.enabled,
                            description: definition.description, icon: definition.icon,
                            eligibilityCheck: definition.eligibilityCheck, targetLevel: definition.targetLevel,
                        });
                    } else console.warn(`No frontend definition for type ID ${typeId}`);
                } else if (typeInfo === null) {
                    // Error already logged in the catch block above
                } else {
                    console.log(`Type ID ${typeId} does not exist or is invalid.`);
                }
            });
            setAvailableMilestones(fetched);
        } catch (e: any) {
            console.error("Error fetching milestone count or processing types:", e);
            setWeb3Error(`Load milestones failed: ${getContractErrorMessage(e)}`);
            setAvailableMilestones([]);
        } finally {
            setIsLoadingMilestones(false); isFetchingMilestonesRef.current = false;
        }
    }, [readOnlyContract, isConnected, MILESTONE_DEFINITIONS]);

    const fetchUserBadges = useCallback(async () => {
        if (!readOnlyContract || !walletAddress || !isConnected || isFetchingBadgesRef.current) return;
        setIsLoadingBadges(true); isFetchingBadgesRef.current = true; setWeb3Error(null);
        try {
            const idsBN: BigNumberish[] = await readOnlyContract.getUserOwnedTokens(walletAddress);
            const ids = idsBN.map(id => id.toString());
            if (ids.length === 0) { setUserBadges([]); return; } // Handle no badges case

            const badgeDetailPromises = ids.map(async (id) => {
                try {
                    const info = await readOnlyContract.getMilestoneInfo(id);
                    const typeId = Number(info.milestoneTypeId);
                    // Fetch image URI and Type Name in parallel *after* getting typeId
                    const [imgUri, typeInfo] = await Promise.all([
                        readOnlyContract.getTokenImageURI(id).catch(() => null), // Gracefully handle image URI error
                        readOnlyContract.getMilestoneTypeInfo(typeId).catch(() => ({ exists: false, name: `Type ${typeId}` })) // Fallback name on error
                    ]);
                    const name = typeInfo.exists ? typeInfo.name : `Type ${typeId}`;
                    return { tokenId: id, milestoneTypeId: typeId, name, level: Number(info.level), date: new Date(Number(info.mintDate) * 1000), contractImageUrl: imgUri || null, metadata: null };
                } catch (e) { console.error(`Failed fetch details for token ${id}:`, e); return null; }
            });
            const results = await Promise.all(badgeDetailPromises);
            setUserBadges(results.filter(b => b !== null) as MintedBadge[]);
        } catch (e: any) {
            console.error("Error fetching user badges:", e);
            setWeb3Error(`Load badges failed: ${getContractErrorMessage(e)}`);
            setUserBadges([]);
        } finally {
            setIsLoadingBadges(false); isFetchingBadgesRef.current = false;
        }
    }, [readOnlyContract, walletAddress, isConnected]);

    const checkAndSetEligibility = useCallback(async (milestone: AvailableMilestone) => {
        if (!appwriteUser?.$id || !walletAddress || !readOnlyContract) {
            toast({ title: "Cannot check eligibility", variant: "destructive" }); return;
        }
        const typeId = milestone.typeId;
        setIsCheckingEligibility(prev => ({ ...prev, [typeId]: true }));
        setIsEligible(prev => ({ ...prev, [typeId]: false }));
        try {
            const currentLevel = Number(await readOnlyContract.getUserMilestoneLevel(walletAddress, typeId));
            if (currentLevel >= milestone.targetLevel) { setIsEligible(prev => ({ ...prev, [typeId]: false })); }
            else {
                const backendEligible = await milestone.eligibilityCheck(appwriteUser.$id, currentLevel);
                setIsEligible(prev => ({ ...prev, [typeId]: backendEligible }));
                if (!backendEligible) toast({ title: "Not Eligible Yet", description: `Criteria for ${milestone.name} Lvl ${milestone.targetLevel} not met.`, variant: "default" });
            }
        } catch (e: any) {
            setIsEligible(prev => ({ ...prev, [typeId]: false }));
            const errorMsg = getContractErrorMessage(e); setWeb3Error(`Eligibility check failed: ${errorMsg}`);
            toast({ title: "Eligibility Check Failed", description: errorMsg, variant: "destructive" });
        } finally { setIsCheckingEligibility(prev => ({ ...prev, [typeId]: false })); }
    }, [toast, appwriteUser?.$id, readOnlyContract, walletAddress, MILESTONE_DEFINITIONS]); // Added MILESTONE_DEFINITIONS as eligibility checks depend on it

    // --- Minting Logic (No Gemini) ---
    const handleMintBadge = useCallback(async (milestone: AvailableMilestone) => {
        if (!contract || !signer || !walletAddress || !appwriteUser?.$id || !isEligible[milestone.typeId] || !milestone.enabled) {
            toast({ title: "Cannot Mint", description: "Prerequisites not met.", variant: "destructive" }); return;
        }
        const typeId = milestone.typeId; const levelToMint = milestone.targetLevel;

        setIsMinting(prev => ({ ...prev, [typeId]: true }));
        // Removed Gemini-specific progress/status
        setMintingError(prev => ({ ...prev, [typeId]: null }));
        setMintingSuccessTx(prev => ({ ...prev, [typeId]: null }));
        let mintedTokenId: string | null = null;

        try {
            toast({ title: "Sending Transaction...", description:"Please confirm in your wallet.", duration: 10000 });
            const tx: TransactionResponse = await contract.mintMilestoneBadge(typeId, levelToMint);
            toast({ title: `Transaction Sent`, description: shortenAddress(tx.hash), duration: 10000 });

            // setMintingStatusText(prev => ({ ...prev, [typeId]: "Waiting for confirmation..." })); // Add status text state if needed
            const receipt = await tx.wait(1); // Wait for 1 confirmation
            // setMintingStatusText(prev => ({ ...prev, [typeId]: "Processing receipt..." }));

            if (!receipt || receipt.status !== 1) throw new Error(`Transaction failed. Status: ${receipt?.status ?? 'unknown'}`);

            // Parse logs to find the minted token ID
            const iface = new Interface(CONTRACT_ABI); const eventTopic = iface.getEvent("MilestoneMinted").topicHash;
            for (const log of receipt.logs) {
                if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics[0] === eventTopic) {
                    try {
                        const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
                        if (parsed?.args.recipient.toLowerCase() === walletAddress.toLowerCase() && Number(parsed.args.milestoneTypeId) === typeId) {
                            mintedTokenId = parsed.args.tokenId.toString(); break;
                        }
                    } catch (e) { /*console.error("Log parse error:", e);*/ }
                 }
             }
             if (!mintedTokenId) { /*console.warn("Could not get tokenId from event.");*/ }

             const successMessage = `Minted ${milestone.name} Lvl ${levelToMint}!`;
             setMintingSuccessTx(prev => ({ ...prev, [typeId]: tx.hash }));
             toast({ title: successMessage, description: `Tx: ${shortenAddress(tx.hash)}`, variant: 'default' });

            await fetchUserBadges(); // Refresh badge list
            setIsEligible(prev => ({ ...prev, [typeId]: false })); // Reset eligibility

        } catch (error: any) {
            const msg = getContractErrorMessage(error); setMintingError(prev => ({ ...prev, [typeId]: msg }));
            toast({ title: "Minting Failed", description: msg, variant: "destructive" });
            // setMintingStatusText(prev => ({ ...prev, [typeId]: "Failed" })); // Update status text on failure
        } finally { setIsMinting(prev => ({ ...prev, [typeId]: false })); }
    }, [contract, signer, walletAddress, isEligible, appwriteUser?.$id, toast, fetchUserBadges]); // Removed getFilePreview

    // --- Fetch On-Chain Metadata (tokenURI) ---
    const fetchTokenMetadata = useCallback(async (tokenId: string) => {
        if (!readOnlyContract || isFetchingMetadata[tokenId]) return;
        setIsFetchingMetadata(prev => ({ ...prev, [tokenId]: true }));
        try {
            const uri = await readOnlyContract.tokenURI(tokenId); let metadata: MintedBadge['metadata'] = null;
            if (uri.startsWith('data:application/json;base64,')) {
                try { const json = Buffer.from(uri.substring(29), 'base64').toString('utf-8'); metadata = JSON.parse(json); }
                catch (e) { /*console.error(`Parse base64 URI ${tokenId} error:`, e);*/ toast({ title: "Metadata Error", variant: "destructive" }); }
            } else if (uri.startsWith('http') || uri.startsWith('ipfs://')) {
                let url = uri.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${uri.substring(7)}` : uri; // Use a public gateway
                try { const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}`); metadata = await res.json(); }
                catch (e) { /*console.error(`Fetch URI ${url} error:`, e);*/ toast({ title: "Metadata Error", variant: "destructive" }); }
            } else { /*console.warn(`Unsupported URI ${tokenId}: ${uri}`);*/ toast({ title: "Metadata Format Error", variant: "destructive" }); }
            if (metadata) setUserBadges(badges => badges.map(b => b.tokenId === tokenId ? { ...b, metadata } : b));
        } catch (e: any) { toast({ title: "Metadata Error", description: getContractErrorMessage(e), variant: "destructive" }); }
        finally { setIsFetchingMetadata(prev => ({ ...prev, [tokenId]: false })); }
    }, [readOnlyContract, toast]);

    // --- Effects ---
    useEffect(() => { // Wallet Listeners
        if (window.ethereum?.on) {
            window.ethereum.on('accountsChanged', handleAccountsChanged); window.ethereum.on('chainChanged', handleChainChanged);
            return () => { if (window.ethereum?.removeListener) { window.ethereum.removeListener('accountsChanged', handleAccountsChanged); window.ethereum.removeListener('chainChanged', handleChainChanged); } };
        }
    }, [handleAccountsChanged, handleChainChanged]);

    useEffect(() => { // Initial Connect Attempt
        const load = async () => { if (window.ethereum?.selectedAddress && !isConnected && !userExplicitlyDisconnected) await connectWallet(); }; load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount only

     useEffect(() => { // Fetch data on connection ready
         if (isConnected && isOnCorrectNetwork && readOnlyContract && walletAddress) { fetchAvailableMilestones(); fetchUserBadges(); }
         else { setAvailableMilestones([]); setUserBadges([]); } // Clear data if disconnected/wrong network
     }, [isConnected, isOnCorrectNetwork, readOnlyContract, walletAddress, fetchAvailableMilestones, fetchUserBadges]);


    // --- Render ---
    return (
        <MainLayout requireAuth={true}>
            <TooltipProvider>
                <div className="container mx-auto max-w-6xl py-8 md:py-12 px-4">
                    {/* Header */}
                    <div className="text-center mb-8 md:mb-12">
                         <h1 className="text-3xl md:text-4xl font-bold text-momcare-primary dark:text-momcare-light tracking-tight">
                             MomCare AI Milestones
                         </h1>
                         <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                             Celebrate your journey! Mint unique, non-transferable NFT badges on the <a href={MONAD_BLOCK_EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="text-momcare-secondary dark:text-blue-400 hover:underline">{MONAD_NETWORK_NAME}</a> for achieving key milestones.
                         </p>
                    </div>

                    {/* Wallet Connection Card */}
                    <Card className="mb-8 shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                         <CardHeader>
                             <CardTitle className="flex items-center text-xl font-semibold dark:text-gray-200">
                                 <Wallet className="mr-2 h-6 w-6 text-momcare-secondary dark:text-blue-400" />
                                 Wallet Connection
                             </CardTitle>
                              <CardDescription className="dark:text-gray-400">
                                  Connect your wallet to the {MONAD_NETWORK_NAME} to mint and view your badges.
                              </CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                 <div className="flex-grow text-sm space-y-1">
                                     {isConnected && walletAddress ? (
                                         <>
                                             <p className="flex items-center text-green-600 dark:text-green-400 font-medium"><CheckCircle className="h-4 w-4 mr-1.5" /> Connected</p>
                                             <p className="text-gray-700 dark:text-gray-300">Address:
                                                 <Tooltip>
                                                      <TooltipTrigger asChild>
                                                          <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs break-all ml-1 cursor-pointer">{shortenAddress(walletAddress)}</span>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                          {walletAddress}
                                                      </TooltipContent>
                                                  </Tooltip>
                                             </p>
                                             <p className={`text-gray-500 dark:text-gray-400 flex items-center ${isOnCorrectNetwork ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                  {isOnCorrectNetwork ? <CheckCircle className="h-4 w-4 mr-1.5"/> : <AlertTriangle className="h-4 w-4 mr-1.5"/>}
                                                  Network: <span className="font-medium ml-1">{networkName || 'Checking...'}</span>
                                                  {!isOnCorrectNetwork && networkName && ` (Expected: ${MONAD_NETWORK_NAME})`}
                                             </p>
                                         </>
                                     ) : ( <p className="text-gray-500 dark:text-gray-400 flex items-center"><XCircle className="h-4 w-4 mr-1.5 text-red-500"/> Wallet not connected.</p> )}
                                 </div>
                                 <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                     {!isConnected ? (
                                         <Button onClick={connectWallet} disabled={isConnecting} className="w-full sm:w-auto">
                                             {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> : <> <Wallet className="mr-2 h-4 w-4" /> Connect Wallet</>}
                                         </Button>
                                     ) : (
                                         <Button variant="outline" size="sm" onClick={disconnectWallet} className="w-full sm:w-auto">
                                             <LogOut className="mr-2 h-4 w-4"/> Disconnect
                                         </Button>
                                     )}
                                     {isConnected && !isOnCorrectNetwork && (
                                          <Button onClick={switchToMonadNetwork} disabled={isSwitchingNetwork} variant="destructive" className="w-full sm:w-auto">
                                              {isSwitchingNetwork ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Switching...</> : <> <Network className="mr-2 h-4 w-4" /> Switch Network</>}
                                          </Button>
                                     )}
                                 </div>
                              </div>
                              {web3Error && (
                                  <Alert variant="destructive" className="mt-4">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertTitle>Error</AlertTitle>
                                      <AlertDescription>{web3Error}</AlertDescription>
                                  </Alert>
                              )}
                         </CardContent>
                    </Card>

                    {/* --- Main Content Area with Tabs --- */}
                    <Tabs defaultValue="available" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="available">Available Milestones</TabsTrigger>
                            <TabsTrigger value="my-badges">Your Badges ({userBadges.length})</TabsTrigger>
                        </TabsList>

                        {/* Available Milestones Tab */}
                        <TabsContent value="available">
                            <div className="mb-4 text-right">
                                 <Button variant="outline" size="sm" onClick={fetchAvailableMilestones} disabled={isLoadingMilestones || !isConnected || !isOnCorrectNetwork}>
                                     <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingMilestones ? 'animate-spin' : ''}`} />
                                     Refresh List
                                 </Button>
                            </div>
                            <div className="space-y-6">
                                {isLoadingMilestones ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-60 w-full dark:bg-gray-700 rounded-lg" />)}
                                    </div>
                                ) : !isConnected || !isOnCorrectNetwork ? (
                                    <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">Please connect your wallet to the {MONAD_NETWORK_NAME} network.</p>
                                ) : availableMilestones.length === 0 && !web3Error ? (
                                    <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">No milestone types currently available or enabled.</p>
                                ) : availableMilestones.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {availableMilestones.map((milestone) => {
                                            const typeId = milestone.typeId;
                                            const userEligible = isEligible[typeId] ?? false;
                                            const checkingEligibility = isCheckingEligibility[typeId] ?? false;
                                            const currentlyMinting = isMinting[typeId] ?? false;
                                            const errorForThis = mintingError[typeId];
                                            const successTx = mintingSuccessTx[typeId];
                                            const hasMintedThisType = userBadges.some(b => b.milestoneTypeId === typeId);
                                            const canCheckEligibility = isConnected && isOnCorrectNetwork && !hasMintedThisType && !currentlyMinting && milestone.enabled;
                                            const canMint = isConnected && isOnCorrectNetwork && !hasMintedThisType && userEligible && !currentlyMinting && milestone.enabled;
                                            const Icon = milestone.icon;
                                            // Removed Gemini progress/status
                                            // const progress = mintingProgress[typeId] ?? 0;
                                            // const statusText = mintingStatusText[typeId] ?? '';

                                            return (
                                                <Card key={typeId} className={`shadow-md border dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col transition-opacity duration-300 ${hasMintedThisType ? 'opacity-60' : milestone.enabled ? 'opacity-100' : 'opacity-40'} hover:shadow-lg`}>
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="flex items-center text-base font-semibold dark:text-gray-200">
                                                            <Icon className={`mr-2 h-5 w-5 flex-shrink-0 ${hasMintedThisType ? 'text-green-500' : 'text-momcare-primary dark:text-momcare-accent'}`} />
                                                            {milestone.name} (Lvl {milestone.targetLevel})
                                                        </CardTitle>
                                                        <CardDescription className="dark:text-gray-400 pt-1 text-xs">
                                                            {milestone.description} {!milestone.enabled && <span className="text-red-500 dark:text-red-400 font-medium">(Minting Disabled)</span>}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow flex flex-col justify-end space-y-2 pt-1">
                                                        {!hasMintedThisType && milestone.enabled && (
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => checkAndSetEligibility(milestone)}
                                                                disabled={!canCheckEligibility || checkingEligibility}
                                                                className={`text-xs w-full ${
                                                                    checkingEligibility ? 'cursor-wait' :
                                                                    userEligible ? 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/30' :
                                                                    isEligible.hasOwnProperty(typeId) && !userEligible ? 'border-red-500 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/30' :
                                                                    'dark:text-gray-300 dark:hover:bg-gray-700'
                                                                }`}
                                                            >
                                                                {checkingEligibility ? <Loader2 className='h-3 w-3 mr-1 animate-spin'/> : null}
                                                                {isEligible.hasOwnProperty(typeId) ? (userEligible ? 'Eligible!' : 'Not Eligible Yet') : 'Check Eligibility'}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            onClick={() => handleMintBadge(milestone)}
                                                            disabled={!canMint || currentlyMinting}
                                                            className="w-full bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-accent dark:hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={!milestone.enabled ? "Minting disabled by admin" : hasMintedThisType ? "Badge already minted for this type" : !isConnected ? "Connect wallet" : !isOnCorrectNetwork ? "Wrong network" : !isEligible.hasOwnProperty(typeId) ? "Check eligibility first" : !userEligible ? "Criteria not met" : `Mint ${milestone.name} Lvl ${milestone.targetLevel}`}
                                                        >
                                                            {currentlyMinting ? (
                                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Minting...</>
                                                            ) : hasMintedThisType ? (
                                                                <><CheckCircle className="mr-2 h-4 w-4" /> Minted</>
                                                            ) : milestone.enabled ? (
                                                                `Mint Badge (Lvl ${milestone.targetLevel})`
                                                            ) : (
                                                                 <><HelpCircle className="mr-2 h-4 w-4" /> Disabled</>
                                                            )}
                                                        </Button>
                                                        {/* Removed Gemini progress indicator */}
                                                    </CardContent>
                                                    <CardFooter className="pt-2 pb-3 px-4 min-h-[24px]">
                                                         {errorForThis && <p className="text-red-500 dark:text-red-400 text-xs truncate flex items-center" title={errorForThis}><XCircle className="h-3 w-3 mr-1 flex-shrink-0"/>{errorForThis}</p>}
                                                         {successTx && !errorForThis &&
                                                            <a href={`${MONAD_BLOCK_EXPLORER_URL}/tx/${successTx}`} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 text-xs truncate flex items-center hover:underline" title={`View Transaction ${successTx}`}>
                                                                <CheckCircle className="h-3 w-3 mr-1 flex-shrink-0"/> Tx: {shortenAddress(successTx)} <ExternalLink className="h-3 w-3 ml-1"/>
                                                            </a>
                                                         }
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        </TabsContent>

                        {/* Your Minted Badges Tab */}
                        <TabsContent value="my-badges">
                             <div className="mb-4 text-right">
                                 <Button variant="outline" size="sm" onClick={fetchUserBadges} disabled={isLoadingBadges || !isConnected || !isOnCorrectNetwork}>
                                     <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingBadges ? 'animate-spin' : ''}`} />
                                     Refresh Badges
                                 </Button>
                             </div>
                            <div className="space-y-4">
                                {isLoadingBadges ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full dark:bg-gray-700 rounded-lg" />)}
                                    </div>
                                ) : !isConnected || !isOnCorrectNetwork ? (
                                    <p className="text-gray-500 dark:text-gray-400 italic text-center py-12">Connect your wallet to the {MONAD_NETWORK_NAME} network to view your badges.</p>
                                ) : userBadges.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {userBadges.sort((a, b) => b.date.getTime() - a.date.getTime()).map((badge) => (
                                            <Card key={badge.tokenId} className="bg-gradient-to-br from-purple-100 via-pink-50 to-blue-50 dark:from-gray-700 dark:via-gray-700/80 dark:to-gray-800 border border-purple-200 dark:border-gray-600 p-4 shadow hover:shadow-lg transition-shadow">
                                                <div className="flex items-start space-x-4">
                                                    {/* Badge Image - Now relies solely on metadata.image */}
                                                    <div className="h-12 w-12 rounded-md bg-gray-200 dark:bg-gray-600 flex-shrink-0 mt-1 border border-gray-300 dark:border-gray-500 flex items-center justify-center overflow-hidden">
                                                        {badge.metadata?.image ? (
                                                            <img
                                                                src={badge.metadata.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${badge.metadata.image.substring(7)}` : badge.metadata.image}
                                                                alt={`${badge.name} Badge`}
                                                                className="h-full w-full object-cover" loading="lazy"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            // Optionally fetch contractImageUrl here if you implement fetching it
                                                            // badge.contractImageUrl ? <img src={badge.contractImageUrl} ... /> :
                                                            <BadgeCheck className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                                                        )}
                                                    </div>
                                                    {/* Badge Details */}
                                                    <div className="flex-grow overflow-hidden">
                                                        <p className="font-semibold text-base text-purple-800 dark:text-purple-200 truncate" title={badge.metadata?.name || badge.name}>
                                                            {badge.metadata?.name || badge.name} {badge.level > 0 ? `(Lvl ${badge.level})` : ''}
                                                        </p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Minted: {format(badge.date, 'MMM d, yyyy')}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Token ID:
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                     <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-[10px] ml-1 cursor-pointer">{badge.tokenId.length > 10 ? shortenAddress(badge.tokenId) : badge.tokenId}</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{badge.tokenId}</TooltipContent>
                                                            </Tooltip>
                                                             <a href={`${MONAD_BLOCK_EXPLORER_URL}/token/${CONTRACT_ADDRESS}/instance/${badge.tokenId}`} target="_blank" rel="noopener noreferrer" className="ml-1 opacity-70 hover:opacity-100">
                                                                 <ExternalLink className="h-3 w-3 inline-block"/>
                                                             </a>
                                                        </p>
                                                        {/* On-chain Metadata Tooltip/Button */}
                                                        <TooltipProvider delayDuration={100}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={() => fetchTokenMetadata(badge.tokenId)}
                                                                        disabled={isFetchingMetadata[badge.tokenId]}
                                                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5 flex items-center disabled:opacity-50 disabled:no-underline"
                                                                    >
                                                                        {isFetchingMetadata[badge.tokenId] ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : null}
                                                                        {badge.metadata ? 'View Details' : 'Load Details'} <Info className="h-3 w-3 ml-1"/>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs text-xs bg-black text-white p-2 rounded shadow-lg">
                                                                    {isFetchingMetadata[badge.tokenId] ? "Loading..." : badge.metadata ? (
                                                                        <>
                                                                            <p><strong>Name:</strong> {badge.metadata.name || 'N/A'}</p>
                                                                            <p><strong>Desc:</strong> {badge.metadata.description || 'N/A'}</p>
                                                                            {/* Display image from metadata if present */}
                                                                            {badge.metadata.image && <p><strong>Image:</strong> <a href={badge.metadata.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${badge.metadata.image.substring(7)}` : badge.metadata.image} target="_blank" rel="noreferrer" className='underline'>Link</a></p>}
                                                                            {badge.metadata.attributes && badge.metadata.attributes.length > 0 && (
                                                                                <div className="mt-1 pt-1 border-t border-gray-600">
                                                                                    <strong>Attributes:</strong>
                                                                                    <ul className="list-disc list-inside">
                                                                                        {badge.metadata.attributes.map(attr => (
                                                                                            <li key={attr.trait_type}>{attr.trait_type}: {attr.display_type === 'date' && typeof attr.value === 'number' ? format(new Date(attr.value * 1000), 'PPp') : String(attr.value)}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : ( <p>Click "Load Details" to fetch metadata from tokenURI.</p> )}
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
                </div>
            </TooltipProvider>
        </MainLayout>
    );
};

export default MonadPage;