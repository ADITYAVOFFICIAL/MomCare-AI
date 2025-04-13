import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Wallet, Gamepad2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DigitalPetABI from '@/lib/abi/DigitalPet.json'; // Import the Pet ABI
import PetCard from '@/components/games/PetCard'; // Import the PetCard component

// --- Environment Variables ---
const contractAddress = import.meta.env.VITE_DIGITAL_PET_CONTRACT_ADDRESS;
const targetChainId = import.meta.env.VITE_MONAD_TESTNET_CHAIN_ID || '10143';

// --- Type Definitions ---
// For data directly from contract's PetAttributes struct
interface PetAttributesFromContract {
    species: string;
    evolutionStage: bigint; // Comes as BigInt from contract
    lastFedTime: bigint;
    experiencePoints: bigint;
}

// For metadata fetched from IPFS (tokenURI)
interface PetMetadata {
    name?: string; // Name might be in metadata or derived
    description?: string;
    image?: string; // Should be ipfs:// or https:// gateway URL
    attributes?: { trait_type: string; value: string | number }[];
}

// Combined type for displaying in the UI
export interface PetData {
    tokenId: string; // Use string for React keys/state
    owner: string;
    attributes: Omit<PetAttributesFromContract, 'evolutionStage' | 'lastFedTime' | 'experiencePoints'> & {
         evolutionStage: number; // Convert BigInts to number for easier use
         lastFedTime: number;
         experiencePoints: number;
    };
    metadata: PetMetadata | null; // Can be null while loading
    metadataURI: string | null; // Store the URI itself
}


const GamesPage: React.FC = () => {
    // --- State ---
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false); // General loading (pets, connection)
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userPets, setUserPets] = useState<PetData[]>([]); // Store fetched pet data
    const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean>(false);
    const { toast } = useToast();

    // --- Network Check and Add Network Helpers (reuse from previous example) ---
    const checkNetwork = useCallback(async (currentProvider: ethers.BrowserProvider | null = provider) => {
         if (!currentProvider) return false;
         try {
             const network = await currentProvider.getNetwork();
             const correct = network.chainId.toString() === targetChainId;
             setIsOnCorrectNetwork(correct);
             if (!correct) setError(`Please switch MetaMask to Monad Testnet (Chain ID: ${targetChainId}).`);
             else setError(null);
             return correct;
         } catch (err) {
             setError("Could not verify network. Check MetaMask connection.");
             setIsOnCorrectNetwork(false);
             return false;
         }
     }, [provider, targetChainId]);

     const addMonadNetwork = useCallback(async () => {
         if (!window.ethereum) { setError("MetaMask is not installed."); return; }
         try {
             await window.ethereum.request({ /* ...params for Monad Testnet...*/ });
             if (provider) await checkNetwork(provider);
         } catch (addError: any) { setError(`Failed to add Monad network: ${addError.message}`); }
     }, [provider, checkNetwork, targetChainId]);


    // --- Connect Wallet (reuse from previous example) ---
    const connectWallet = useCallback(async () => {
         if (!window.ethereum) { setError("MetaMask is not installed."); return; }
         setIsConnecting(true); setError(null);
         try {
             const browserProvider = new ethers.BrowserProvider(window.ethereum);
             setProvider(browserProvider);
             const accounts = await browserProvider.send("eth_requestAccounts", []);
             if (accounts && accounts.length > 0) {
                 const currentAccount = accounts[0];
                 setAccount(currentAccount); setIsConnected(true);
                 const currentSigner = await browserProvider.getSigner(); setSigner(currentSigner);
                 toast({ title: "Wallet Connected" });
                 await checkNetwork(browserProvider);
             } else { setError("No accounts found."); setIsConnected(false); }
         } catch (err: any) { setError(`Connection failed: ${err.message}`); setIsConnected(false); setAccount(null); setSigner(null); setProvider(null); }
         finally { setIsConnecting(false); }
     }, [toast, checkNetwork]);

    // --- Fetch Pet Metadata from IPFS ---
    const fetchMetadata = useCallback(async (tokenURI: string): Promise<PetMetadata | null> => {
        if (!tokenURI) return null;
        // Convert ipfs:// URI to an accessible gateway URL
        const gatewayURL = tokenURI.replace(/^ipfs:\/\//, 'https://gateway.pinata.cloud/ipfs/'); // Or your preferred gateway
        try {
            const response = await fetch(gatewayURL);
            if (!response.ok) {
                throw new Error(`Failed to fetch metadata from ${gatewayURL} (Status: ${response.status})`);
            }
            const data: PetMetadata = await response.json();
            // Convert image URI in metadata as well, if it's also ipfs://
            if (data.image?.startsWith('ipfs://')) {
                data.image = data.image.replace(/^ipfs:\/\//, 'https://gateway.pinata.cloud/ipfs/');
            }
            return data;
        } catch (err) {
            console.error(`Error fetching metadata from ${gatewayURL}:`, err);
            return null; // Return null if fetching fails
        }
    }, []);


    // --- Fetch User's Pets ---
    const fetchUserPets = useCallback(async () => {
        if (!provider || !account || !contractAddress || !isOnCorrectNetwork) {
            setUserPets([]); // Clear pets if prerequisites not met
            return;
        }

        setIsLoading(true);
        setError(null);
        console.log(`Fetching pets for account ${account} from contract ${contractAddress}`);

        try {
            const contract = new ethers.Contract(contractAddress, DigitalPetABI.abi, provider);
            // Get the total number of pets minted (totalSupply is part of standard ERC721)
            const totalSupplyBigInt: bigint = await contract.totalSupply();
            const totalSupply = Number(totalSupplyBigInt); // Convert to number
            console.log("Total Supply:", totalSupply);

            if (totalSupply === 0) {
                setUserPets([]);
                setIsLoading(false);
                return;
            }

            const ownedPetsData: PetData[] = [];
            const fetchPromises: Promise<void>[] = [];

            // Loop through possible token IDs (from 1 up to totalSupply)
            // WARNING: This is INEFFICIENT for large collections!
            // A real dApp would use event indexing or a subgraph.
            for (let i = 1; i <= totalSupply; i++) {
                 fetchPromises.push(
                     (async () => {
                         try {
                             const owner: string = await contract.ownerOf(i);
                             if (owner.toLowerCase() === account.toLowerCase()) {
                                 console.log(`Token ID ${i} owned by user. Fetching details...`);
                                 const [attributesRaw, tokenURI] = await Promise.all([
                                     contract.getPetAttributes(i),
                                     contract.tokenURI(i)
                                 ]);

                                 // Convert BigInts from attributes
                                 const attributes: PetData['attributes'] = {
                                     species: attributesRaw.species,
                                     evolutionStage: Number(attributesRaw.evolutionStage),
                                     lastFedTime: Number(attributesRaw.lastFedTime),
                                     experiencePoints: Number(attributesRaw.experiencePoints),
                                 };

                                  // Fetch metadata asynchronously
                                  const metadata = await fetchMetadata(tokenURI);

                                  ownedPetsData.push({
                                     tokenId: i.toString(),
                                     owner: owner,
                                     attributes: attributes,
                                     metadata: metadata,
                                     metadataURI: tokenURI
                                  });
                                 console.log(`Added pet data for token ID ${i}`);
                             }
                         } catch (err) {
                             // It's common for ownerOf to fail if token ID was burned or doesn't exist
                             if (err.message.includes('nonexistent token')) {
                                // console.debug(`Token ID ${i} does not exist or was burned.`);
                             } else {
                                  console.error(`Error fetching details for token ID ${i}:`, err);
                             }
                         }
                     })()
                 );
            }

             // Wait for all fetches to complete
             await Promise.all(fetchPromises);

             // Sort pets by Token ID (optional)
             ownedPetsData.sort((a, b) => parseInt(a.tokenId) - parseInt(b.tokenId));

            setUserPets(ownedPetsData);
            console.log(`Finished fetching. Found ${ownedPetsData.length} pets for user.`);

        } catch (err: any) {
            console.error("Error fetching user pets:", err);
            setError(`Failed to load your pets: ${err.message}`);
            setUserPets([]);
            toast({ title: "Error Loading Pets", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [provider, account, contractAddress, isOnCorrectNetwork, toast, fetchMetadata]); // Add fetchMetadata

    // --- Interaction Handlers (Feed, Train, Evolve) ---
    const handlePetInteraction = useCallback(async (tokenId: string, action: 'feed' | 'train' | 'evolve') => {
        if (!signer || !contractAddress || !isOnCorrectNetwork) {
            toast({ title: "Action Failed", description: "Wallet not connected or on wrong network.", variant: "destructive" });
            return;
        }

        const actionVerb = action.charAt(0).toUpperCase() + action.slice(1); // Feed, Train, Evolve
        const toastId = toast({ title: `${actionVerb}ing Pet #${tokenId}...`, description: "Please confirm in MetaMask.", duration: 15000 }); // Show indefinite toast

        try {
            const contract = new ethers.Contract(contractAddress, DigitalPetABI.abi, signer);
            let tx: ethers.ContractTransactionResponse;

            console.log(`Attempting to ${action} pet #${tokenId}...`);
            switch (action) {
                case 'feed':
                    tx = await contract.feedPet(tokenId);
                    break;
                case 'train':
                    tx = await contract.trainPet(tokenId);
                    break;
                case 'evolve':
                    tx = await contract.evolvePet(tokenId);
                    break;
                default:
                     throw new Error("Invalid action");
            }

            console.log(`${actionVerb} Transaction Sent:`, tx.hash);
            toastId.update({ id: toastId.id, description: "Transaction sent. Waiting for confirmation..." });

            const receipt = await tx.wait(); // Wait for transaction to be mined

            console.log(`${actionVerb} Transaction Mined:`, receipt);

             if (receipt?.status === 1) {
                 toastId.update({ id: toastId.id, title: `Pet ${actionVerb} Successful!`, description: `Pet #${tokenId} was ${action.toLowerCase()}ed.`, duration: 5000 });
                 // Refresh pet data after successful interaction
                 fetchUserPets();
             } else {
                throw new Error("Transaction failed on-chain.");
             }

        } catch (err: any) {
            console.error(`Error during ${action} interaction for pet ${tokenId}:`, err);
             let errMsg = `Failed to ${action} pet #${tokenId}. `;
             if (err.code === 'ACTION_REJECTED') {
                 errMsg += "Transaction rejected in MetaMask.";
             } else if (err.message.includes('Pet not hungry yet')) {
                errMsg += "Pet not hungry yet (cooldown).";
             } else if (err.message.includes('Not enough experience')) {
                 errMsg += "Not enough experience to evolve.";
             } else if (err.message.includes('max evolution stage')) {
                 errMsg += "Pet is already at max evolution stage.";
             } else if (err.message.includes('Caller is not owner nor approved')) {
                  errMsg += "You don't own this pet.";
             } else {
                 errMsg += err.reason || err.message; // Show reason from contract revert if available
             }

             toastId.update({ id: toastId.id, title: `Pet ${actionVerb} Failed`, description: errMsg, variant: "destructive", duration: 7000 });
             setError(errMsg); // Also show error in the main error display area
        }
    }, [signer, contractAddress, isOnCorrectNetwork, toast, fetchUserPets]);


    // --- Effects ---
    // Initial connection attempt
    useEffect(() => {
        if (window.ethereum && window.ethereum.selectedAddress) { connectWallet(); }
    }, [connectWallet]);

    // Fetch pets when connected and on correct network
    useEffect(() => {
        if (isConnected && isOnCorrectNetwork) { fetchUserPets(); }
        else { setUserPets([]); } // Clear pets if disconnected/wrong network
    }, [isConnected, isOnCorrectNetwork, fetchUserPets]);

    // Handle account/network changes
    useEffect(() => {
        if (!window.ethereum) return;
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length > 0) { setAccount(accounts[0]); setIsConnected(true); if (provider) { provider.getSigner().then(setSigner); checkNetwork(provider); } }
            else { setAccount(null); setSigner(null); setIsConnected(false); setIsOnCorrectNetwork(false); setError("Wallet disconnected."); setUserPets([]); }
        };
        const handleChainChanged = () => { if (provider) checkNetwork(provider); else connectWallet(); };
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
        return () => { /* remove listeners */ };
    }, [provider, connectWallet, checkNetwork]);

    // --- Render ---
    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
                <div className="text-center mb-10 md:mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-momcare-primary dark:text-momcare-light flex items-center justify-center gap-3">
                        <Gamepad2 className="w-8 h-8" /> Digital Pet Odyssey <Gamepad2 className="w-8 h-8" />
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-3 max-w-2xl mx-auto">
                       Collect, raise, and evolve your unique digital pets on the Monad Testnet!
                    </p>
                </div>

                {/* Connection & Network Status */}
                <div className='mb-8'>
                     {!isConnected ? (
                         <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
                             {/* ... Connect Wallet Button ... */}
                              <Wallet className="h-4 w-4" />
                              <AlertTitle>Connect Your Wallet</AlertTitle>
                              <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-2">
                                  Connect MetaMask to manage your digital pets.
                                  <Button onClick={connectWallet} disabled={isConnecting} size="sm" className="mt-2 sm:mt-0">
                                      {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                      Connect MetaMask
                                  </Button>
                              </AlertDescription>
                         </Alert>
                     ) : !isOnCorrectNetwork ? (
                          <Alert variant="destructive">
                              {/* ... Wrong Network Warning ... */}
                               <AlertCircle className="h-4 w-4" />
                               <AlertTitle>Wrong Network Detected</AlertTitle>
                               <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-2">
                                   {`Switch MetaMask to Monad Testnet (ID: ${targetChainId}).`}
                                   <Button onClick={addMonadNetwork} variant="destructive" size="sm" className="mt-2 sm:mt-0"> Switch/Add Network </Button>
                               </AlertDescription>
                          </Alert>
                     ) : (
                         <Alert variant="success" className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
                              {/* ... Connected Info ... */}
                              <Wallet className="h-4 w-4" />
                              <AlertTitle>Wallet Connected</AlertTitle>
                              <AlertDescription> Account: <span className="font-mono text-xs bg-green-100 dark:bg-green-800 px-1 py-0.5 rounded">{account?.substring(0, 6)}...{account?.substring(account.length - 4)}</span> (Monad Testnet) </AlertDescription>
                         </Alert>
                     )}
                      {/* General Error */}
                      {error && isOnCorrectNetwork && (
                          <Alert variant="destructive" className="mt-4">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{error}</AlertDescription>
                          </Alert>
                      )}
                 </div>

                 {/* Pet Display Area */}
                 <div className="mb-6 flex justify-end">
                       <Button onClick={fetchUserPets} disabled={!isConnected || !isOnCorrectNetwork || isLoading} variant="outline">
                           <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                           Refresh My Pets
                       </Button>
                  </div>

                 {isLoading ? (
                      <div className="text-center py-16"> <Loader2 className="h-12 w-12 text-momcare-primary animate-spin mx-auto" /> <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your pets...</p> </div>
                 ) : !isConnected || !isOnCorrectNetwork ? (
                       <div className="text-center py-16 text-gray-500 dark:text-gray-400">Connect your wallet and switch to Monad Testnet to see your pets.</div>
                 ) : userPets.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                         {userPets.map((pet) => (
                             <PetCard
                                 key={pet.tokenId}
                                 petData={pet}
                                 onInteract={handlePetInteraction} // Pass the interaction handler
                                 />
                         ))}
                     </div>
                 ) : (
                      <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed dark:border-gray-700">
                           <Gamepad2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                           <h3 className="mt-2 text-lg font-medium text-gray-800 dark:text-gray-200">No Pets Found</h3>
                          <p className="mt-1 text-sm">You don't seem to own any Digital Pets yet!</p>
                          {/* Add a link/button to a minting page/feature if you implement one */}
                      </div>
                 )}
            </div>
        </MainLayout>
    );
};

export default GamesPage;