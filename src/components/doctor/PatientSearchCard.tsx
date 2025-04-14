// src/components/doctor/PatientSearchCard.tsx
import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { searchUserProfiles, UserProfile } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, User, Inbox, AlertTriangle } from 'lucide-react';

const PatientSearchCard: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false); // Track if a search has been performed
    const { toast } = useToast();

    const handleSearch = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!searchQuery.trim()) {
            toast({ title: "Info", description: "Please enter a name or email to search.", variant: "default" });
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true); // Mark that a search was attempted

        try {
            const foundProfiles = await searchUserProfiles(searchQuery);
            setResults(foundProfiles);
            if (foundProfiles.length === 0) {
                 toast({ title: "No Results", description: `No patients found matching "${searchQuery}".`, variant: "default" });
            }
        } catch (err: any) {
            const errorMessage = err.message || "Failed to search for patients.";
            setError(errorMessage);
            toast({ title: "Search Error", description: errorMessage, variant: "destructive" });
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="shadow-md border border-gray-200 h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-momcare-primary">
                    <Search className="mr-2 h-5 w-5" />
                    Patient Search
                </CardTitle>
                <CardDescription>Find patient profiles by name or email.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <Input
                        type="text"
                        placeholder="Enter name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-grow"
                        aria-label="Search patients"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !searchQuery.trim()} className="flex-shrink-0">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        <span className="sr-only sm:not-sr-only sm:ml-1">Search</span>
                    </Button>
                </form>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                    {isLoading && (
                        // Loading Skeleton
                        <>
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-3/4" />
                        </>
                    )}

                    {!isLoading && error && (
                         <div className="flex flex-col items-center justify-center text-center py-6 text-red-600">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="font-semibold">Error searching</p>
                            <p className="text-xs">{error}</p>
                         </div>
                    )}

                    {!isLoading && !error && hasSearched && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-6 text-gray-500">
                           <Inbox className="h-8 w-8 mb-2" />
                           <p>No patients found matching your search.</p>
                        </div>
                    )}

                    {!isLoading && !error && results.length > 0 && (
                        <ul className="divide-y divide-gray-200">
                            {results.map((profile) => (
                                <li key={profile.$id} className="py-2 px-1 hover:bg-gray-50 rounded">
                                    <Link to={`/patient/${profile.userId}`} className="flex items-center space-x-3 text-sm group">
                                         {/* Basic icon placeholder */}
                                         <span className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="h-4 w-4 text-gray-500" />
                                         </span>
                                         <div className="flex-grow min-w-0">
                                            <p className="font-medium text-gray-800 group-hover:text-momcare-primary truncate">{profile.name || 'N/A'}</p>
                                            <p className="text-gray-500 truncate">{profile.email || 'No email'}</p>
                                         </div>
                                         {/* Add more info or actions if needed */}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                     {!isLoading && !error && !hasSearched && (
                         <div className="flex flex-col items-center justify-center text-center py-6 text-gray-400">
                            <p className="text-sm">Enter a search term above to find patients.</p>
                         </div>
                     )}
                </div>
                {/* Removed placeholder button */}
            </CardContent>
        </Card>
    );
};

export default PatientSearchCard;