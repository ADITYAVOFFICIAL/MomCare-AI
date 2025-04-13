import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers, Contract, BrowserProvider, Signer, BigNumberish } from 'ethers';
import Matter from 'matter-js'; // Import Matter.js

// --- UI Imports ---
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Trophy, Gamepad2, CheckCircle, XCircle, LinkIcon, RefreshCw, Network, LogOut } from 'lucide-react'; // Added LogOut icon

// --- Import the Game Component ---
import StackingGame from '@/components/game/StackingGame';

// --- Contract Details (Ensure these are correct) ---
const CONTRACT_ADDRESS = "0x54cF6041b08e9Bc00A15300A17F3647A1044E117";
const CONTRACT_ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "rank",
				"type": "uint256"
			}
		],
		"name": "LeaderboardUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			}
		],
		"name": "NewHighScore",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_score",
				"type": "uint256"
			}
		],
		"name": "submitScore",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getLeaderboard",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "player",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "score",
						"type": "uint256"
					}
				],
				"internalType": "struct StackTheBox.ScoreEntry[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getLeaderboardLength",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_player",
				"type": "address"
			}
		],
		"name": "getPlayerHighScore",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "highScores",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "leaderboard",
		"outputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_LEADERBOARD_SIZE",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];


// --- Monad Network Details (Verified) ---
const MONAD_CHAIN_ID = '0x279f'; // 10143
const MONAD_NETWORK_NAME = 'Monad Testnet';
const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';
const MONAD_CURRENCY_SYMBOL = 'MON';
const MONAD_CURRENCY_DECIMALS = 18;
const MONAD_BLOCK_EXPLORER_URL = 'https://testnet.monadexplorer.com';

const MONAD_NETWORK_PARAMS = {
  chainId: MONAD_CHAIN_ID, chainName: MONAD_NETWORK_NAME,
  nativeCurrency: { name: MONAD_NETWORK_NAME, symbol: MONAD_CURRENCY_SYMBOL, decimals: MONAD_CURRENCY_DECIMALS },
  rpcUrls: [MONAD_RPC_URL], blockExplorerUrls: [MONAD_BLOCK_EXPLORER_URL],
};

// --- Helper Functions ---
const shortenAddress = (address: string | undefined): string => {
  if (!address) return '...';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

interface ScoreEntry {
  player: string;
  score: BigNumberish;
}

// --- Constants for Video ---
const VIDEO_SRC = "/high.mp4"; // Ensure high.mp4 is in your public folder
const VIDEO_VISIBLE_DURATION_MS = 7000;

// --- Main Page Component ---
const GamesPage: React.FC = () => {
  // --- State ---
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [readOnlyContract, setReadOnlyContract] = useState<Contract | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [highScore, setHighScore] = useState<string>('0');
  const [lastReportedGameScore, setLastReportedGameScore] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean>(false);
  const [maxLeaderboardSize, setMaxLeaderboardSize] = useState<number>(10);
  const [playHighScoreVideo, setPlayHighScoreVideo] = useState<boolean>(false);
  // NEW: Track if the user explicitly disconnected via the button
  const [userExplicitlyDisconnected, setUserExplicitlyDisconnected] = useState<boolean>(false);


  const { toast } = useToast();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoOverlayRef = useRef<HTMLDivElement>(null);

  // --- Network Switching Function (Unchanged) ---
  const switchToMonadNetwork = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) { setError("MetaMask is not installed."); toast({ title: "MetaMask Required", variant: "destructive" }); return false; }
    setIsSwitchingNetwork(true); setError(null);
    const switchToast = toast({ title: "Requesting Network Switch..." });
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MONAD_CHAIN_ID }], });
      switchToast.update({ id: switchToast.id, title: "Network Switched!", description: `Now on ${MONAD_NETWORK_NAME}`, variant: "default" });
      // Reset explicit disconnect flag if they switch back successfully
      setUserExplicitlyDisconnected(false);
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        switchToast.update({ id: switchToast.id, title: "Network Not Found", description: `Adding ${MONAD_NETWORK_NAME}...` });
        try {
          await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [MONAD_NETWORK_PARAMS], });
          switchToast.update({ id: switchToast.id, title: "Network Added!", description: `Now on ${MONAD_NETWORK_NAME}`, variant: "default" });
          // Reset explicit disconnect flag if they add successfully
          setUserExplicitlyDisconnected(false);
          return true;
        } catch (addError: any) {
          let message = "Failed to add Monad network."; if (addError.code === 4001) message = "Request rejected.";
          setError(message); switchToast.update({ id: switchToast.id, title: "Network Add Failed", description: message, variant: "destructive" });
          return false;
        }
      } else {
        let message = "Failed to switch network."; if (switchError.code === 4001) message = "Request rejected.";
        setError(message); switchToast.update({ id: switchToast.id, title: "Network Switch Failed", description: message, variant: "destructive" });
        return false;
      }
    } finally {
        setIsSwitchingNetwork(false);
    }
  }, [toast]);

  // --- Check Network Function (Unchanged) ---
  const checkNetwork = useCallback(async (currentProvider: BrowserProvider | null): Promise<boolean> => {
    if (!currentProvider) {
        setIsOnCorrectNetwork(false);
        setNetworkName(null);
        return false;
    }
    let isCorrect = false;
    try {
      const network = await currentProvider.getNetwork();
      const currentChainId = `0x${network.chainId.toString(16)}`;
      setNetworkName(network.name);
      isCorrect = currentChainId.toLowerCase() === MONAD_CHAIN_ID.toLowerCase();
      setIsOnCorrectNetwork(isCorrect);
      if(isCorrect) {
          setError(prev => prev?.includes("network") || prev?.includes("Switch") ? null : prev); // Clear network errors if now correct
      } else {
          setError(`Please switch MetaMask to ${MONAD_NETWORK_NAME}. You are currently on ${network.name}.`);
      }
      console.log(`Network check: ${isCorrect ? 'Correct' : 'Incorrect'} network (${network.name}, ${currentChainId})`);
    } catch (err) {
      console.error("Error checking network:", err);
      setError("Could not detect network. Ensure MetaMask is connected and permissions are granted.");
      setIsOnCorrectNetwork(false); setNetworkName(null);
    }
    return isCorrect;
  }, []);

  // --- Setup Contracts and Signer (Unchanged) ---
  const setupEthers = useCallback(async (currentProvider: BrowserProvider, currentAddress: string) => {
      try {
          console.log("Setting up signer and contracts...");
          const currentSigner = await currentProvider.getSigner();
          setSigner(currentSigner);
          const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentSigner);
          setContract(gameContract);
          // Setup read-only contract using the provider directly
          const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, currentProvider);
          setReadOnlyContract(readContract);
          console.log("Signer and contracts initialized.");
          return true;
      } catch (error) {
           console.error("Error setting up signer/contracts:", error);
           setError("Failed to initialize contract connection. Please refresh.");
           setSigner(null); setContract(null); setReadOnlyContract(null);
           return false;
      }
  }, []);

  // --- Reset Connection State Function (NEW) ---
  const resetConnectionState = useCallback(() => {
      console.log("Resetting connection state...");
      setIsConnected(false);
      setUserAddress(null);
      setProvider(null);
      setSigner(null);
      setContract(null);
      setReadOnlyContract(null); // Clear read-only contract too
      setIsOnCorrectNetwork(false);
      setNetworkName(null);
      setLeaderboard([]);
      setHighScore('0');
      setLastReportedGameScore(0);
      setError(null); // Clear errors on disconnect
      // DO NOT reset userExplicitlyDisconnected here
  }, []);

  // --- Disconnect Wallet Function (NEW) ---
  const disconnectWallet = useCallback(() => {
      console.log("User requested disconnect from dApp.");
      resetConnectionState();
      setUserExplicitlyDisconnected(true); // Set the flag
      toast({ title: "Wallet Disconnected", description: "Wallet connection state cleared in the app." });
  }, [resetConnectionState, toast]);


  // --- Connect Wallet Function (Refined) ---
  const connectWallet = useCallback(async (triggeredByListener = false) => {
    // Prevent connection if connecting/switching, or if user explicitly disconnected via button
    if (isConnecting || isSwitchingNetwork || userExplicitlyDisconnected) {
        if (userExplicitlyDisconnected) {
            console.log("Connect attempt blocked: User explicitly disconnected.");
        }
        return;
    }
    setError(null); setIsConnecting(true);

    if (typeof window.ethereum === 'undefined') {
      setError("MetaMask is not installed. Please install it to continue."); toast({ title: "MetaMask Required", variant: "destructive" });
      setIsConnecting(false); return;
    }

    let browserProvider: BrowserProvider | null = null;
    let userAddr: string | null = null;

    try {
      let accounts: string[];
      // Request accounts only if not triggered by listener finding an existing account
      if (triggeredByListener && window.ethereum.selectedAddress) {
           console.log("Connecting via listener with existing address:", window.ethereum.selectedAddress);
           accounts = [window.ethereum.selectedAddress];
      } else {
           console.log("Requesting accounts via eth_requestAccounts...");
           accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      }

      if (accounts.length === 0) {
          // This case might happen if the user locks MetaMask after connecting
          throw new Error("No account selected/available in MetaMask.");
      }
      userAddr = accounts[0];
      console.log("Account found/selected:", userAddr);

      // Use 'any' network to allow connection regardless of the initial network
      browserProvider = new ethers.BrowserProvider(window.ethereum, 'any');
      setProvider(browserProvider);
      setUserAddress(userAddr);
      setIsConnected(true);
      // IMPORTANT: Reset explicit disconnect flag on successful connection
      setUserExplicitlyDisconnected(false);

      const networkOk = await checkNetwork(browserProvider);

      if (networkOk) {
          // Setup signer and contracts only if on the correct network
          const setupOk = await setupEthers(browserProvider, userAddr);
          if (setupOk) {
              toast({ title: "Wallet Connected", description: `Address: ${shortenAddress(userAddr)} on ${MONAD_NETWORK_NAME}` });
          } else {
              // Handle setup failure (rare, but possible)
              setError("Connected, but failed to initialize contracts. Please refresh.");
              toast({ title: "Initialization Error", description: "Could not set up contract interaction.", variant: "destructive" });
          }
      } else {
          // Connected, but wrong network. Don't set up signer/write contract.
          // Set up read-only contract for fetching data even on wrong network (optional, depends on desired UX)
          // For simplicity here, we'll only set up readOnlyContract if network is correct.
          // If you want leaderboard visible even on wrong network, set it up here too.
          setSigner(null);
          setContract(null);
          // Optionally set up read-only contract here if needed on wrong network
          const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, browserProvider);
          setReadOnlyContract(readContract); // Allow fetching leaderboard even if network wrong
          console.log("Wallet connected, but network incorrect. Write contracts not set.");
          // Error is already set by checkNetwork
          toast({ title: "Wallet Connected", description: `Address: ${shortenAddress(userAddr)}, but on wrong network (${networkName || 'Unknown'}).`, variant: "default" }); // Changed "warning" to "default"
      }

    } catch (err: any) {
      console.error("Error during connect/setup:", err);
      let message = "Failed to connect wallet.";
      if (err.code === 4001) message = "Connection request rejected by user.";
      else if (err.message?.includes("disconnected")) message = "MetaMask is disconnected or locked.";
      else if (err.message?.includes("No account selected")) message = "No account selected/available in MetaMask.";
      else if (err.message) message = err.message;

      setError(message);
      toast({ title: "Connection Error", description: message, variant: "destructive" });
      // Full reset if connection fails
      resetConnectionState();
      setUserExplicitlyDisconnected(false); // Allow retry if connection failed
    } finally {
       setIsConnecting(false);
    }
  }, [toast, checkNetwork, setupEthers, isConnecting, isSwitchingNetwork, resetConnectionState, userExplicitlyDisconnected, networkName]); // Added dependencies


  // --- Fetch Contract Data (Modified to use readOnlyContract more reliably) ---
  const fetchContractData = useCallback(async () => {
    // Use readOnlyContract - it might exist even if not on correct network (if set up that way)
    // Require userAddress to fetch player-specific score
    if (!readOnlyContract) {
        console.log("Skipping fetch: Read-only contract not available.");
        // Optionally clear data if contract disappears
        // setLeaderboard([]);
        // setHighScore('0');
        return;
    }
    // Only fetch player score if address is known
    const shouldFetchPlayerScore = !!userAddress;

    console.log("Attempting to fetch contract data...", { hasContract: !!readOnlyContract, hasUser: shouldFetchPlayerScore });
    setIsLoadingData(true);
    // Keep network error if it exists, otherwise clear general errors before fetch
    setError(prev => prev?.includes("network") || prev?.includes("Switch") ? prev : null);

    try {
      const promises = [
        readOnlyContract.getLeaderboard(),
        readOnlyContract.MAX_LEADERBOARD_SIZE()
      ];
      // Conditionally add player high score promise
      if (shouldFetchPlayerScore) {
          promises.splice(1, 0, readOnlyContract.getPlayerHighScore(userAddress)); // Insert at index 1
      }

      const results = await Promise.allSettled(promises);

      const boardResult = results[0];
      const scoreResult = shouldFetchPlayerScore ? results[1] : null;
      const sizeResult = results[shouldFetchPlayerScore ? 2 : 1];

      if (boardResult.status === 'fulfilled' && Array.isArray(boardResult.value)) {
          setLeaderboard(boardResult.value.map((entry: any) => ({ player: entry.player, score: entry.score })));
      } else {
          console.warn("Failed to fetch leaderboard:", boardResult.status === 'rejected' ? boardResult.reason : 'Invalid format');
          setLeaderboard([]); // Clear leaderboard on error
          // Don't set a generic error here, let specific errors show if needed
      }

      if (scoreResult) {
          if (scoreResult.status === 'fulfilled') {
              setHighScore(scoreResult.value.toString());
          } else {
              console.warn("Failed to fetch player high score:", scoreResult.reason);
              setHighScore('0'); // Reset high score on error
          }
      } else {
          setHighScore('0'); // Reset if no user address
      }


      if (sizeResult.status === 'fulfilled') {
          setMaxLeaderboardSize(Number(sizeResult.value));
      } else {
          console.warn("Failed to fetch max leaderboard size:", sizeResult.reason);
          // Keep default or previous value
      }

      console.log("Data fetch attempt complete.");
    } catch (err) {
      // This catch block might not be reached if Promise.allSettled handles individual errors
      console.error("Unexpected error during bulk data fetching:", err);
      setError("Could not fetch all game data. Some information might be missing.");
      // Decide if you want to clear all data on a full failure
      // setLeaderboard([]);
      // setHighScore('0');
      toast({ title: "Data Fetch Error", description: "Failed to retrieve some data from the contract.", variant: "destructive" });
    } finally { setIsLoadingData(false); }
  }, [readOnlyContract, userAddress, toast]); // Removed isOnCorrectNetwork dependency here if we allow read-only fetches


  // --- Submit Score Function (Added clarification for Overflow error) ---
  const submitScore = useCallback(async () => {
    // Critical checks: Need signer, contract, address, score > 0, and correct network
    if (!contract || !signer || !userAddress || !isOnCorrectNetwork) {
      let desc = "Cannot submit score. Ensure your wallet is connected to the correct network.";
      if (!isOnCorrectNetwork) desc = `Switch to ${MONAD_NETWORK_NAME} to submit.`;
      else if (!contract || !signer) desc = "Wallet/contract not ready. Try reconnecting.";
      setError(desc);
      toast({title: "Submission Error", description: desc, variant: "destructive"})
      return;
    }
    if (lastReportedGameScore <= 0) {
        setError("No score to submit. Play a round first.");
        toast({title: "Submission Error", description: "Play a round first.", variant: "default"}) // Changed "warning" to "default"
        return;
    }

    setIsSubmitting(true); setError(null);
    const scoreToast = toast({ title: "Submitting Score...", description: `Sending score: ${lastReportedGameScore}` });

    try {
      console.log(`Attempting to submit score: ${lastReportedGameScore} from ${userAddress}`);
      // Estimate gas explicitly first (optional but good for debugging)
      // try {
      //   const estimatedGas = await contract.estimateGas.submitScore(lastReportedGameScore);
      //   console.log("Gas estimated:", estimatedGas.toString());
      // } catch (gasError: any) {
      //   console.error("Gas estimation failed:", gasError);
      //   // Rethrow or handle specific gas errors if needed
      //   throw gasError;
      // }

      const tx = await contract.submitScore(lastReportedGameScore);
      scoreToast.update({ id: scoreToast.id, title: "Transaction Sent", description: "Waiting for confirmation..." });
      await tx.wait(1); // Wait for 1 confirmation
      scoreToast.update({ id: scoreToast.id, title: "Score Submitted!", description: "Leaderboard will update shortly.", variant: "default" });
      setLastReportedGameScore(0); // Reset score AFTER successful submission
      await fetchContractData(); // Refresh data
    } catch (err: any) {
       let message = "Failed to submit score.";
       let title = "Submission Failed";

       // Check for specific error codes/reasons
       if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
           message = "Transaction rejected by user in MetaMask.";
       } else if (err.reason) {
           // Ethers.js often provides a reason string
           message = `Transaction failed: ${err.reason}`;
           // **Specifically check for the overflow panic**
           if (err.reason.includes("Panic") && err.reason.includes("OVERFLOW(17)")) {
               title = "Contract Error";
               message = "Transaction failed due to an arithmetic overflow/underflow in the smart contract (Panic 0x11). Please report this to the developers.";
               console.error("CONTRACT BUG DETECTED: Arithmetic Overflow/Underflow (Panic 0x11) on submitScore.");
           }
       } else if (err.code === -32603 && err.data?.message) {
            // Handle internal JSON-RPC errors if they contain a message
            message = `Transaction failed: ${err.data.message}`;
             if (err.data.message.includes("Panic") && err.data.message.includes("overflow")) { // Check internal message too
               title = "Contract Error";
               message = "Transaction failed due to an arithmetic overflow/underflow in the smart contract. Please report this.";
               console.error("CONTRACT BUG DETECTED: Arithmetic Overflow/Underflow (Panic 0x11) on submitScore.");
           }
       } else if (err.message?.includes("insufficient funds")) {
           message = "Insufficient funds for gas fees.";
       } else if (err.message) {
           // Fallback to general error message
           message = err.message;
       }

       console.error("Submit score error:", err); // Log the full error object
       setError(message);
       scoreToast.update({ id: scoreToast.id, title: title, description: message, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  }, [contract, signer, userAddress, lastReportedGameScore, toast, fetchContractData, isOnCorrectNetwork]); // Added isOnCorrectNetwork


  // --- Callback to receive score from game component (Unchanged) ---
  const handleGameScoreReport = useCallback((score: number) => {
    console.log(`Game reported final score: ${score}`);
    setLastReportedGameScore(score);

    const currentHighScoreNum = parseInt(highScore || '0', 10);

    if (score > 0) {
        toast({ title: "Game Over!", description: `Score: ${score}. Ready to submit.`});
        if (score > currentHighScoreNum) {
            console.log(`New High Score! ${score} > ${currentHighScoreNum}`);
            toast({
                title: "🎉 New High Score! 🎉",
                description: `Your new high score is ${score}!`,
                duration: VIDEO_VISIBLE_DURATION_MS
            });
            setPlayHighScoreVideo(true);
        }
    }
  }, [toast, highScore]);

  // --- Effects ---

  // Initial connection check (only if not explicitly disconnected)
  useEffect(() => {
    const init = async () => {
      if (!userExplicitlyDisconnected && window.ethereum?.selectedAddress && window.ethereum.isConnected()) {
        console.log("Attempting auto-connect on load...");
        await connectWallet(true); // Trigger connection using existing address
      } else {
        console.log("Skipping auto-connect: No pre-selected address, wallet disconnected, or user explicitly disconnected.");
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userExplicitlyDisconnected]); // Run only when explicit disconnect state changes or on mount


  // Fetch data when dependencies change (contract, address, network status)
  useEffect(() => {
    // Fetch data if we have the read-only contract and either the network is correct OR we want to show data anyway
    // Also requires user address to fetch personal high score
    if (readOnlyContract && userAddress) {
        // Fetch regardless of network correctness IF you want to show leaderboard always
        // OR fetch only if on correct network: if (readOnlyContract && userAddress && isOnCorrectNetwork)
      fetchContractData();
    } else if (!isConnected) {
        // Clear data if fully disconnected
        setLeaderboard([]);
        setHighScore('0');
    }
    // If only readOnlyContract exists but no userAddress, maybe fetch only leaderboard?
    else if (readOnlyContract && !userAddress) {
        fetchContractData(); // Will fetch leaderboard but skip high score
    }
  }, [readOnlyContract, userAddress, isOnCorrectNetwork, fetchContractData, isConnected]); // Added isOnCorrectNetwork, isConnected

  // Handle wallet events
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log("MetaMask accounts changed:", accounts);
      if (accounts.length === 0) {
           // Wallet locked or disconnected in MetaMask itself
           console.log("Wallet disconnected or locked via MetaMask.");
           setError("Wallet disconnected or locked.");
           toast({ title: "Wallet Disconnected", description: "Please unlock or reconnect MetaMask.", variant: "default" }); // Changed "warning" to "default"
           resetConnectionState(); // Reset dApp state
           setUserExplicitlyDisconnected(false); // Allow reconnection attempt if they unlock/reconnect in MM
      } else if (accounts[0] !== userAddress) {
           // Switched to a different account
           console.log("Account switched in MetaMask, re-initializing...");
           // Reset explicit disconnect flag if they switch accounts
           setUserExplicitlyDisconnected(false);
           // Re-run connection logic for the new account
           connectWallet(true); // Use true to indicate it's listener-triggered
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log("MetaMask network changed:", chainId);
      // Reset explicit disconnect flag if they change networks
      setUserExplicitlyDisconnected(false);
      // Re-run connection logic to check the new network and update state
      // Important: Use a provider instance if available, otherwise trigger full connect
      if (provider) {
          checkNetwork(provider).then(networkOk => {
              if (networkOk && userAddress) {
                  // If network is now correct, re-setup ethers
                  setupEthers(provider, userAddress);
              } else {
                  // Network wrong, clear signer/contract, keep provider/address
                  setSigner(null);
                  setContract(null);
                  // Keep readOnlyContract if desired
              }
              // Fetch data might be needed again depending on network change
              fetchContractData();
          });
      } else {
          // If provider was lost, trigger full reconnect
          connectWallet(true);
      }
    };

    // Subscribe
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Cleanup
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
    // Dependencies need to include functions used inside handlers if they aren't stable
  }, [connectWallet, resetConnectionState, userAddress, provider, checkNetwork, setupEthers, fetchContractData]);


  // --- Effect for High Score Video Playback (Unchanged) ---
  useEffect(() => {
    const videoElement = videoRef.current;
    const overlayElement = videoOverlayRef.current;
    let hideTimer: NodeJS.Timeout | null = null;

    if (playHighScoreVideo && videoElement && overlayElement) {
      console.log("Starting high score video effect...");
      videoElement.currentTime = 0;
      const playPromise = videoElement.play();

      if (playPromise !== undefined) {
          playPromise.then(() => {
              overlayElement.style.visibility = 'visible';
              overlayElement.style.opacity = '1';
              console.log("Video playing, showing overlay instantly.");
              hideTimer = setTimeout(() => {
                  console.log("Hiding overlay instantly and resetting state.");
                  overlayElement.style.visibility = 'hidden';
                  overlayElement.style.opacity = '0';
                  videoElement.pause();
                  setPlayHighScoreVideo(false);
              }, VIDEO_VISIBLE_DURATION_MS);

          }).catch(error => {
              console.error("Error playing video:", error);
              overlayElement.style.visibility = 'hidden';
              overlayElement.style.opacity = '0';
              setPlayHighScoreVideo(false);
          });
      } else {
          console.warn("Video play() did not return a promise.");
          overlayElement.style.visibility = 'visible';
          overlayElement.style.opacity = '1';
          hideTimer = setTimeout(() => {
              overlayElement.style.visibility = 'hidden';
              overlayElement.style.opacity = '0';
              videoElement.pause();
              setPlayHighScoreVideo(false);
          }, VIDEO_VISIBLE_DURATION_MS);
      }
    }

    return () => { if (hideTimer) clearTimeout(hideTimer); };
  }, [playHighScoreVideo]);


  // --- Render Logic ---
  return (
    <MainLayout>
      {/* High Score Video Overlay (Unchanged) */}
      <div
        ref={videoOverlayRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10000,
          opacity: 0, visibility: 'hidden', pointerEvents: 'none',
        }}
        className="highscore-video-overlay"
      >
        <video ref={videoRef} src={VIDEO_SRC} playsInline loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative">
        {/* Header Card */}
        <Card className="mb-8 border-momcare-primary/20 shadow-lg">
            <CardHeader className="bg-momcare-light dark:bg-black">
              <CardTitle className="text-2xl md:text-3xl font-bold text-momcare-primary dark:text-momcare-light flex items-center">
                <Gamepad2 className="mr-3 h-7 w-7" /> Stack the Box Challenge (on Monad)
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Stack the boxes as high as you can! Submit your score to the Monad blockchain leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
               {/* Connection Status Display */}
               <div className="flex-grow">
                  {!isConnected ? (
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">Connect your wallet to play and submit scores.</p>
                  ) : !isOnCorrectNetwork ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
                            Connected to wrong network ({networkName || 'Unknown'}).
                        </p>
                        <Button variant="destructive" size="sm" onClick={switchToMonadNetwork} disabled={isSwitchingNetwork || isConnecting}>
                            {isSwitchingNetwork ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                            Switch to {MONAD_NETWORK_NAME}
                        </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-green-700 dark:text-green-400 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        Connected: {shortenAddress(userAddress)} on {networkName || MONAD_NETWORK_NAME}
                    </div>
                  )}
               </div>

               {/* Connect / Disconnect Button */}
               <Button
                onClick={() => {
                    if (isConnected) {
                        disconnectWallet(); // Call disconnect if already connected
                    } else {
                        // Reset the explicit disconnect flag BEFORE trying to connect again
                        setUserExplicitlyDisconnected(false);
                        connectWallet(false); // Call connect if not connected
                    }
                }}
                disabled={isConnecting || isSwitchingNetwork}
                className={`min-w-[170px] ${isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-momcare-primary hover:bg-momcare-dark'}`} // Red for disconnect
              >
                {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...</> :
                 isSwitchingNetwork ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Switching...</> :
                 isConnected ? <><LogOut className="mr-2 h-4 w-4" /> Disconnect Wallet</> : // Show Disconnect when connected
                 <><LinkIcon className="mr-2 h-4 w-4" /> Connect Wallet</> // Show Connect when disconnected
                }
              </Button>
            </CardContent>
        </Card>

        {/* Error Display Area (Prioritize Network Errors) */}
        {error && error.includes("network") && (
            <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Network Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                {/* Offer switch button only if connected but on wrong network */}
                {isConnected && !isOnCorrectNetwork && (
                    <Button variant="outline" size="sm" onClick={switchToMonadNetwork} disabled={isSwitchingNetwork} className="mt-2 border-destructive text-destructive hover:bg-destructive/10">
                        {isSwitchingNetwork ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                        Try Switching Network
                    </Button>
                )}
            </Alert>
        )}
        {error && !error.includes("network") && ( // Show other errors if no network error
            <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {/* Main Game Area and Leaderboard */}
        {/* Show game/leaderboard IF connected, even if network is wrong (leaderboard might still load) */}
        {isConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Game Area Card */}
            <Card className={`md:col-span-2 border-gray-300 dark:border-gray-700 flex flex-col shadow-md ${!isOnCorrectNetwork ? 'opacity-70 pointer-events-none' : ''}`}> {/* Disable game if wrong network */}
              <CardHeader>
                <CardTitle className="text-xl">Game Area</CardTitle>
                 <CardDescription>
                    {isOnCorrectNetwork ? 'Click/Tap inside the game area to drop a box.' : 'Switch to Monad Testnet to play.'}
                    {lastReportedGameScore > 0 && !isSubmitting && isOnCorrectNetwork && (
                        <span className="ml-2 font-semibold text-momcare-primary dark:text-momcare-light">Last Score: {lastReportedGameScore}</span>
                    )}
                 </CardDescription>
              </CardHeader>
              <CardContent ref={gameContainerRef} className="flex-grow p-0 overflow-hidden min-h-[400px] relative bg-gray-50 dark:bg-gray-800/50">
                 {/* Render StackingGame only if on correct network */}
                 {isOnCorrectNetwork ? (
                     <StackingGame
                       onGameOver={handleGameScoreReport}
                       disabled={isSubmitting || !isOnCorrectNetwork} // Also disable if submitting
                     />
                 ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 p-4">
                        Switch to {MONAD_NETWORK_NAME} to play the game.
                    </div>
                 )}
              </CardContent>
              <CardFooter className="pt-4 flex justify-end border-t dark:border-gray-700">
                {/* Submit button only enabled if on correct network and score > 0 */}
                <Button onClick={submitScore} disabled={!isOnCorrectNetwork || isSubmitting || lastReportedGameScore <= 0 || isLoadingData} className="min-w-[150px] bg-green-600 hover:bg-green-700 disabled:opacity-50">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Score"}
                </Button>
              </CardFooter>
            </Card>

            {/* Leaderboard and High Score Area */}
            <div className="md:col-span-1 space-y-6">
               {/* High Score Card */}
              <Card className="border-gray-300 dark:border-gray-700 shadow-sm">
                <CardHeader><CardTitle className="text-xl flex items-center"><Trophy className="mr-2 h-5 w-5 text-yellow-500"/> Your High Score</CardTitle></CardHeader>
                <CardContent className="text-center min-h-[60px] flex items-center justify-center">
                  {isLoadingData && highScore === '0' ? <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto" /> :
                   userAddress ? <p className="text-3xl font-bold text-momcare-primary dark:text-momcare-light">{highScore}</p> :
                   <p className="text-sm text-gray-500">Connect wallet to see your score</p>
                  }
                </CardContent>
              </Card>
               {/* Leaderboard Card */}
               <Card className="border-gray-300 dark:border-gray-700 shadow-sm">
                 <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-xl">Leaderboard</CardTitle>
                    <Button variant="ghost" size="icon" onClick={fetchContractData} disabled={isLoadingData || !readOnlyContract} className="h-7 w-7 text-gray-500 dark:text-gray-400 disabled:opacity-50" title="Refresh Leaderboard">
                        <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                    </Button>
                 </CardHeader>
                 <CardContent className="px-0 min-h-[200px]"> {/* Added min-height */}
                   {isLoadingData ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div> :
                    !readOnlyContract ? <p className="text-center text-gray-500 dark:text-gray-400 py-4 px-2">Connect wallet to view leaderboard.</p> :
                    leaderboard.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-4 px-2">Leaderboard is empty or failed to load.</p> :
                    (<Table>
                       <TableHeader><TableRow><TableHead className="w-[40px] pl-2 pr-1">#</TableHead><TableHead>Player</TableHead><TableHead className="text-right pr-2 pl-1">Score</TableHead></TableRow></TableHeader>
                       <TableBody>{leaderboard.map((entry, index) => (<TableRow key={entry.player + '-' + index}><TableCell className="font-medium pl-2 pr-1">{index + 1}</TableCell><TableCell title={entry.player}>{shortenAddress(entry.player)}</TableCell><TableCell className="text-right font-semibold pr-2 pl-1">{entry.score.toString()}</TableCell></TableRow>))}</TableBody>
                     </Table>)}
                   {leaderboard.length > 0 && (<p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3 px-2">Showing Top {leaderboard.length} / {maxLeaderboardSize}</p>)}
                 </CardContent>
               </Card>
            </div>
          </div>
        ) : (
           // Placeholder when NOT connected
           <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-dashed dark:border-gray-700 min-h-[400px] flex flex-col justify-center items-center">
               <Gamepad2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
               <p className="font-medium text-lg text-gray-700 dark:text-gray-300 mb-2">Connect Your Wallet</p>
               <p>Connect your wallet to play the Stack the Box game and view the leaderboard.</p>
               <Button onClick={() => connectWallet(false)} disabled={isConnecting} className="mt-4">
                  {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null } Connect Wallet
               </Button>
           </div>
        )}
      </div>
    </MainLayout>
  );
};

export default GamesPage;