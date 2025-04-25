// src/components/doctor/PendingReviewsCard.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, AlertTriangle, RefreshCw, UserCircle, Download, Info } from 'lucide-react';
import {
    getAllRecentMedicalDocuments,
    getUserProfilesByIds,
    getFilePreview, // Import getFilePreview
    medicalBucketId, // Import bucket ID
    MedicalDocument,
    UserProfile,
} from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';

const PendingReviewsCard: React.FC = () => {
    const { toast } = useToast();

    // 1. Fetch all recent medical documents
    const {
        data: documentsData,
        isLoading: isLoadingDocuments,
        isError: isErrorDocuments,
        error: documentsError,
        refetch: refetchDocuments,
    } = useQuery<MedicalDocument[], Error>({
        queryKey: ['allRecentMedicalDocuments'],
        queryFn: () => getAllRecentMedicalDocuments(50), // Fetch up to 50 documents
    });

    // 2. Extract unique user IDs from fetched documents
    const patientUserIds = useMemo(() => {
        if (!documentsData) return [];
        const ids = documentsData.map(doc => doc.userId);
        return [...new Set(ids)]; // Deduplicate
    }, [documentsData]);

    // 3. Fetch profiles for the users who uploaded documents
    const {
        data: patientProfilesMap,
        isLoading: isLoadingProfiles,
        isError: isErrorProfiles,
        error: profilesError,
    } = useQuery<Map<string, UserProfile>, Error>({
        queryKey: ['patientProfilesForDocuments', patientUserIds],
        queryFn: () => getUserProfilesByIds(patientUserIds),
        enabled: !!patientUserIds && patientUserIds.length > 0, // Only run if there are user IDs
    });

    // Combine loading states
    const isLoading = isLoadingDocuments || (patientUserIds.length > 0 && isLoadingProfiles);
    // Combine error states/messages
    const isError = isErrorDocuments || (patientUserIds.length > 0 && isErrorProfiles);
    const errorMessage = documentsError?.message || profilesError?.message || "An error occurred.";

    const handleRefresh = () => {
        refetchDocuments();
        // Profiles will refetch automatically if user IDs change or query becomes enabled
    };

    // Function to handle document download/view
    const handleViewDocument = (fileId: string, fileName: string) => {
        if (!medicalBucketId) {
            toast({ title: "Configuration Error", description: "Medical document storage is not configured.", variant: "destructive" });
            return;
        }
        try {
            const fileUrl = getFilePreview(fileId, medicalBucketId);
            if (fileUrl) {
                // Open in new tab
                window.open(fileUrl.href, '_blank', 'noopener,noreferrer');
                // Optional: Trigger download (might be blocked by browser)
                // const link = document.createElement('a');
                // link.href = fileUrl.href;
                // link.setAttribute('download', fileName); // Suggest filename
                // document.body.appendChild(link);
                // link.click();
                // document.body.removeChild(link);
            } else {
                toast({ title: "Error", description: "Could not generate link for this document.", variant: "destructive" });
            }
        } catch (error: any) {
            // console.error("Error getting file preview:", error);
            toast({ title: "Error", description: `Failed to get document link: ${error.message}`, variant: "destructive" });
        }
    };


    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start justify-between space-x-3 p-3 border dark:border-gray-700 rounded-md">
                            <div className="flex items-start space-x-3 flex-grow overflow-hidden">
                                <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 mt-1" />
                                <div className="space-y-1.5 flex-grow">
                                    <Skeleton className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700" />
                                    <Skeleton className="h-3 w-3/5 bg-gray-200 dark:bg-gray-700" />
                                    <Skeleton className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                             <Skeleton className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0" />
                        </div>
                    ))}
                </div>
            );
        }

        if (isError) {
            return (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Documents</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            );
        }

        if (!documentsData || documentsData.length === 0) {
            return <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">No recent documents found.</p>;
        }

        // Sort documents by creation date (descending)
        const sortedDocuments = [...documentsData].sort((a, b) =>
            parseISO(b.$createdAt).getTime() - parseISO(a.$createdAt).getTime()
        );

        return (
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {sortedDocuments.map((doc) => {
                    const patientProfile = patientProfilesMap?.get(doc.userId);
                    const uploadedDate = parseISO(doc.$createdAt);

                    return (
                        <li key={doc.$id} className="flex items-start justify-between space-x-3 p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800/50">
                           <div className="flex items-start space-x-3 flex-grow overflow-hidden">
                                {patientProfile?.profilePhotoUrl ? (
                                    <img src={patientProfile.profilePhotoUrl} alt={patientProfile.name || 'Patient'} className="h-10 w-10 rounded-full object-cover flex-shrink-0 mt-1" />
                                ) : (
                                    <UserCircle className="h-10 w-10 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
                                )}
                                <div className="flex-grow overflow-hidden">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={doc.fileName}>
                                        {doc.fileName || 'Untitled Document'}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        Patient: {patientProfile?.name || `User ID: ${doc.userId.substring(0, 6)}...`}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        Uploaded: {formatDistanceToNow(uploadedDate, { addSuffix: true })}
                                    </p>
                                    {doc.documentType && (
                                        <Badge variant="outline" className="mt-1 text-xs px-1.5 py-0.5">
                                            {doc.documentType.split('/')[1] || doc.documentType} {/* Show subtype or full type */}
                                        </Badge>
                                    )}
                                    {/* Link to patient detail */}
                                    <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs mt-1 mr-2 text-momcare-primary dark:text-momcare-accent">
                                        <Link to={`/doctor/patient/${doc.userId}`}>View Patient</Link>
                                    </Button>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleViewDocument(doc.fileId, doc.fileName)}
                                className="flex-shrink-0"
                                aria-label={`View document ${doc.fileName}`}
                            >
                                <Download className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <Card className="shadow-md border dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                        <FileText className="h-5 w-5 text-momcare-accent" />
                        Recent Documents
                    </CardTitle>
                    <CardDescription>Recently uploaded patient medical documents.</CardDescription>
                 </div>
                 <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} aria-label="Refresh documents">
                     <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                 </Button>
            </CardHeader>
            <CardContent>
                 <Alert variant="default" className="mb-4 text-xs bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                        Showing all recent documents system-wide. Future versions may filter by review status or assigned patients.
                    </AlertDescription>
                </Alert>
                {renderContent()}
            </CardContent>
        </Card>
    );
};

export default PendingReviewsCard;