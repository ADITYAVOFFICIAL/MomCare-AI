import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserSearch, Search, Loader2, AlertTriangle, UserCircle, Mail, CalendarDays, Activity, Inbox } from 'lucide-react';
import { searchUserProfiles, getRecentUserProfiles, UserProfile } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const PatientSearchCard: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [initialPatients, setInitialPatients] = useState<UserProfile[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState<boolean>(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true); // Start loading initial list
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState<boolean>(false);
    const { toast } = useToast();

    // Fetch initial list of recent patients
    const fetchInitial = useCallback(async () => {
        setIsLoadingInitial(true);
        setError(null);
        try {
            const recentProfiles = await getRecentUserProfiles(10); // Fetch 10 recent
            setInitialPatients(recentProfiles);
        } catch (err: any) {
            // console.error("Error fetching initial patients:", err);
            setError(err.message || "Failed to load recent patients.");
            toast({ title: "Load Failed", description: "Could not load recent patients.", variant: "destructive" });
        } finally {
            setIsLoadingInitial(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitial(); // Fetch initial list on component mount
    }, [fetchInitial]);

    // Handle search execution
    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            // If search term is empty, reset to show initial list
            setHasSearched(false);
            setSearchResults([]);
            setError(null);
            return;
        }
        setIsLoadingSearch(true);
        setError(null);
        setHasSearched(true); // Indicate that a search has been performed
        setSearchResults([]); // Clear previous search results

        try {
            const foundProfiles = await searchUserProfiles(searchTerm.trim()); // Use search function
            setSearchResults(foundProfiles);
        } catch (err: any) {
            const errorMessage = err.message?.includes("index")
                ? "Search functionality is not fully configured (missing index). Please contact support."
                : err.message || "An error occurred while searching for patients.";
            setError(errorMessage);
            toast({ title: "Search Failed", description: errorMessage, variant: "destructive" });
        } finally {
            setIsLoadingSearch(false);
        }
    }, [searchTerm, toast]);

    // Handle input changes
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);
        // If input is cleared, reset search state to show initial list
        if (!newSearchTerm.trim() && hasSearched) {
            setHasSearched(false);
            setSearchResults([]);
            setError(null);
        }
    };

    // Handle Enter key press for search
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Helper to format date relative to now
    const formatRelativeDate = (dateString: string | undefined): string => {
        if (!dateString) return 'unknown';
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch {
            return 'invalid date';
        }
    };

    // Render the list (either initial or search results)
    const renderPatientList = (patients: UserProfile[], listType: 'initial' | 'search') => {
        if (patients.length === 0) {
            if (listType === 'search') {
                return <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">No patients found matching "{searchTerm}".</p>;
            } else {
                return (
                    <div className="flex flex-col items-center justify-center text-center py-6 text-gray-400 dark:text-gray-500">
                        <Inbox className="h-8 w-8 mb-2" />
                        <p className="text-sm">No recently active patients found.</p>
                    </div>
                );
            }
        }

        return (
            <ul className="space-y-3 mt-4 max-h-96 overflow-y-auto pr-2">
                {patients.map((profile) => (
                    <li key={profile.$id} className="flex items-center justify-between space-x-3 p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center space-x-3 overflow-hidden">
                             {profile.profilePhotoUrl ? (
                                <img src={profile.profilePhotoUrl} alt={profile.name || 'Patient'} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                             ) : (
                                <UserCircle className="h-10 w-10 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                             )}
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{profile.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                    <Mail className="h-3 w-3 flex-shrink-0" /> {profile.email || 'No email'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {typeof profile.age === 'number' && <span><UserCircle className="h-3 w-3 inline mr-0.5"/>Age: {profile.age}</span>}
                                    {typeof profile.weeksPregnant === 'number' && <span><CalendarDays className="h-3 w-3 inline mr-0.5"/>Weeks: {profile.weeksPregnant}</span>}
                                    {profile.$updatedAt && <span title={new Date(profile.$updatedAt).toLocaleString()}><Activity className="h-3 w-3 inline mr-0.5"/>Active: {formatRelativeDate(profile.$updatedAt)}</span>}
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                            <Link to={`/doctor/patient/${profile.userId}`}>View</Link>
                        </Button>
                    </li>
                ))}
            </ul>
        );
    };

    // Render loading skeletons
    const renderSkeletons = (count = 3) => (
        <div className="space-y-3 mt-4">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 border dark:border-gray-700 rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-1.5 flex-grow">
                        <Skeleton className="h-4 w-3/5 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <Skeleton className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
            ))}
        </div>
    );

    return (
        <Card className="shadow-md border dark:border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                    <UserSearch className="h-5 w-5 text-momcare-primary" />
                    Find Patient
                </CardTitle>
                <CardDescription>Search by name/email or view recent patients.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-2">
                    <Input
                        type="text"
                        placeholder="Enter name or email..."
                        value={searchTerm}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        disabled={isLoadingSearch || isLoadingInitial} // Disable input while loading either list
                        className="flex-grow dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                        aria-label="Search for patients"
                    />
                    <Button onClick={handleSearch} disabled={isLoadingSearch || isLoadingInitial || !searchTerm.trim()} aria-label="Search patients">
                        {isLoadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Conditional Rendering Logic */}
                {isLoadingInitial ? (
                    renderSkeletons(5) // Show skeletons while loading initial list
                ) : error ? (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : hasSearched ? (
                    // If a search has been performed, show search loading or results
                    isLoadingSearch ? renderSkeletons(3) : renderPatientList(searchResults, 'search')
                ) : (
                    // Otherwise, show the initial list
                    renderPatientList(initialPatients, 'initial')
                )}
            </CardContent>
        </Card>
    );
};

export default PatientSearchCard;