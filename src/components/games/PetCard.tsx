import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Activity, Utensils, Zap, Loader2, Info, Clock } from 'lucide-react'; // Use Zap for Evolve
import type { PetData } from '@/pages/GamesPage'; // Import the type

interface PetCardProps {
    petData: PetData;
    onInteract: (tokenId: string, action: 'feed' | 'train' | 'evolve') => Promise<void>;
}

// Define evolution requirements here or pass them down
const XP_TO_EVOLVE_STAGE_1 = 50;
const XP_TO_EVOLVE_STAGE_2 = 150;
const FEED_COOLDOWN_SECONDS = 60 * 60; // 1 hour in seconds

const PetCard: React.FC<PetCardProps> = ({ petData, onInteract }) => {
    const [isInteracting, setIsInteracting] = useState<'feed' | 'train' | 'evolve' | null>(null);
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000)); // Current time in seconds

    // Update current time every second for cooldown display
    useEffect(() => {
         const interval = setInterval(() => {
             setCurrentTime(Math.floor(Date.now() / 1000));
         }, 1000);
         return () => clearInterval(interval);
     }, []);


    const { tokenId, attributes, metadata, owner } = petData;
    const { species, evolutionStage, lastFedTime, experiencePoints } = attributes;

    // --- Calculate Interaction Eligibility ---
    const canFeed = useMemo(() => {
        return currentTime >= lastFedTime + FEED_COOLDOWN_SECONDS;
    }, [currentTime, lastFedTime]);

    const feedCooldownRemaining = useMemo(() => {
        if (canFeed) return 0;
        return (lastFedTime + FEED_COOLDOWN_SECONDS) - currentTime;
    }, [canFeed, currentTime, lastFedTime]);


    const canEvolve = useMemo(() => {
        if (evolutionStage === 1 && experiencePoints >= XP_TO_EVOLVE_STAGE_1) return true;
        if (evolutionStage === 2 && experiencePoints >= XP_TO_EVOLVE_STAGE_2) return true;
        return false;
    }, [evolutionStage, experiencePoints]);

    const xpToNextEvolution = useMemo(() => {
         if (evolutionStage === 1) return XP_TO_EVOLVE_STAGE_1;
         if (evolutionStage === 2) return XP_TO_EVOLVE_STAGE_2;
         return Infinity; // Already max stage
     }, [evolutionStage]);


    // --- Interaction Handler ---
    const handleInteractionClick = async (action: 'feed' | 'train' | 'evolve') => {
        if (isInteracting) return; // Prevent multiple clicks
        setIsInteracting(action);
        try {
            await onInteract(tokenId, action);
        } catch (e) {
            // Error is likely handled in the parent page's toast
            console.error(`Interaction failed from card: ${action}`, e);
        } finally {
            setIsInteracting(null);
        }
    };

    // --- Format Cooldown Time ---
    const formatCooldown = (seconds: number): string => {
        if (seconds <= 0) return "Ready";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    };


    return (
         <TooltipProvider delayDuration={100}>
             <Card className="flex flex-col h-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white dark:bg-gray-800">
                 <CardHeader className="p-4 pb-2 relative">
                      {/* Display Metadata Image */}
                      {metadata?.image ? (
                          <img src={metadata.image} alt={metadata.name || `Pet ${tokenId}`} className="w-full h-40 object-contain rounded-md mb-3 bg-gray-100 dark:bg-gray-700 p-1" />
                      ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center rounded-md mb-3">
                              <Sparkles className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                          </div>
                      )}
                      <CardTitle className="text-md font-semibold text-momcare-primary dark:text-momcare-light flex items-center justify-between">
                          <span>{metadata?.name || `Pet #${tokenId}`}</span>
                          <Badge variant="outline" className="text-xs">ID: {tokenId}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs pt-1 text-gray-500 dark:text-gray-400">
                         {species} - Stage {evolutionStage}
                      </CardDescription>
                 </CardHeader>

                 <CardContent className="p-4 pt-1 flex-grow space-y-2.5 text-sm">
                     {/* Attributes Display */}
                     <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">XP:</span> {experiencePoints} / {xpToNextEvolution !== Infinity ? xpToNextEvolution : "Max"}
                     </div>
                     <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">Last Fed:</span> {new Date(lastFedTime * 1000).toLocaleString()}
                     </div>
                     {metadata?.description && (
                         <p className="text-xs text-gray-600 dark:text-gray-400 italic pt-1 border-t dark:border-gray-700">{metadata.description}</p>
                     )}
                     {/* Metadata Attributes (Optional) */}
                     {/* {metadata?.attributes && metadata.attributes.length > 0 && (
                         <div className="text-xs space-y-0.5 pt-1">
                              {metadata.attributes.map(attr => (
                                  <div key={attr.trait_type}><strong>{attr.trait_type}:</strong> {attr.value}</div>
                              ))}
                         </div>
                     )} */}
                 </CardContent>

                 <CardFooter className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-1.5">
                      {/* Feed Button */}
                      <Tooltip>
                         <TooltipTrigger asChild>
                             <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2" onClick={() => handleInteractionClick('feed')} disabled={!canFeed || !!isInteracting}>
                                 {isInteracting === 'feed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <> <Utensils className="mr-1 h-3.5 w-3.5" /> Feed </>}
                             </Button>
                         </TooltipTrigger>
                         <TooltipContent> <p>{canFeed ? "Feed your pet" : `Feed Cooldown: ${formatCooldown(feedCooldownRemaining)}`}</p> </TooltipContent>
                     </Tooltip>

                      {/* Train Button */}
                      <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2" onClick={() => handleInteractionClick('train')} disabled={!!isInteracting}>
                                 {isInteracting === 'train' ? <Loader2 className="h-4 w-4 animate-spin" /> : <> <Activity className="mr-1 h-3.5 w-3.5" /> Train </>}
                             </Button>
                         </TooltipTrigger>
                         <TooltipContent> <p>Train to gain {XP_PER_TRAINING} XP</p> </TooltipContent>
                     </Tooltip>

                      {/* Evolve Button */}
                      <Tooltip>
                         <TooltipTrigger asChild>
                             <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2" onClick={() => handleInteractionClick('evolve')} disabled={!canEvolve || !!isInteracting}>
                                 {isInteracting === 'evolve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <> <Zap className="mr-1 h-3.5 w-3.5" /> Evolve </>}
                             </Button>
                         </TooltipTrigger>
                         <TooltipContent>
                             <p>{evolutionStage >= 3 ? "Max evolution stage reached" : !canEvolve ? `Need ${xpToNextEvolution - experiencePoints} more XP to evolve` : "Evolve to next stage!"}</p>
                         </TooltipContent>
                     </Tooltip>

                 </CardFooter>
             </Card>
         </TooltipProvider>
     );
};

export default PetCard;