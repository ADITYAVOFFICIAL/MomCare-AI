// src/components/doctor/PendingReviewsCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getAllRecentMedicalDocuments, getUserProfilesByIds, getFilePreview, MedicalDocument, UserProfile, medicalBucketId } from '@/lib/appwrite'; // Import medicalBucketId
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, User, Inbox, AlertTriangle, Download, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PendingReviewsCard: React.FC = () => {
    const [documents, setDocuments] = useState<MedicalDocument[]>([]);
    const [patientProfiles, setPatientProfiles] = useState<Map<string, UserProfile>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchDocumentsAndProfiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch all recent documents (adjust limit as needed)
            // WARNING: Fetches ALL recent docs. Needs filtering by status/doctor in production.
            const fetchedDocs = await getAllRecentMedicalDocuments(20);
            setDocuments(fetchedDocs);

            if (fetchedDocs.length > 0) {
                // Get unique patient IDs
                const patientIds = [...new Set(fetchedDocs.map(doc => doc.userId))];
                // Fetch corresponding patient profiles
                const profilesMap = await getUserProfilesByIds(patientIds);
                setPatientProfiles(profilesMap);
            } else {
                setPatientProfiles(new Map()); // Clear if no docs
            }

        } catch (err: any) {
            const errorMessage = err.message || "Failed to load medical documents.";
            setError(errorMessage);
            toast({ title: "Loading Error", description: errorMessage, variant: "destructive" });
            setDocuments([]);
            setPatientProfiles(new Map());
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchDocumentsAndProfiles();
    }, [fetchDocumentsAndProfiles]);

    // Helper to format date
     const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return 'Unknown date';
        try {
            return format(parseISO(dateString), 'MMM d, yyyy, p'); // Include time
        } catch { return 'Invalid date'; }
     };

    // Function to get file URL (ensure medicalBucketId is exported from appwrite.ts)
    const getDocumentUrl = (fileId: string) => {
        if (!medicalBucketId) {
            console.error("Medical Bucket ID not configured for file preview.");
            return '#';
        }
        try {
            const url = getFilePreview(fileId, medicalBucketId); // Using getFileView
            return url?.href || '#';
        } catch (e) {
            console.error("Error generating file preview URL:", e);
            return '#';
        }
    };

     // Placeholder action
    const handleMarkReviewed = (docId: string) => {
         toast({ title: "Action Required", description: `Implement logic to mark document ${docId.substring(0,6)}... as reviewed.` });
         // In a real app: call an Appwrite function or update the document status
    };


    return (
        <Card className="shadow-md border border-gray-200 h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-momcare-primary">
                    <FileText className="mr-2 h-5 w-5" />
                    Medical Document Queue
                </CardTitle>
                <CardDescription>Recently uploaded documents for review.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                    Note: Currently showing all recent documents. Needs filtering by review status in a full setup.
                 </p>
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                    {isLoading && (
                        <>
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-5/6" />
                        </>
                    )}
                    {!isLoading && error && (
                        <div className="flex flex-col items-center justify-center text-center py-6 text-red-600">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="font-semibold">Error loading documents</p>
                            <p className="text-xs">{error}</p>
                         </div>
                    )}
                    {!isLoading && !error && documents.length === 0 && (
                         <div className="flex flex-col items-center justify-center text-center py-6 text-gray-500">
                           <Inbox className="h-8 w-8 mb-2" />
                           <p>No recent documents found.</p>
                        </div>
                    )}
                    {!isLoading && !error && documents.length > 0 && (
                         <ul className="divide-y divide-gray-100">
                            {documents.map((doc) => {
                                const patient = patientProfiles.get(doc.userId);
                                const fileUrl = getDocumentUrl(doc.fileId);
                                return (
                                    <li key={doc.$id} className="py-3 px-1">
                                        <div className="flex items-start justify-between gap-3">
                                             <div className="flex-grow min-w-0">
                                                 <p className="text-sm font-medium text-gray-800 truncate flex items-center">
                                                    <FileText className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                                                    {doc.fileName}
                                                 </p>
                                                 <p className="text-xs text-gray-500 mt-0.5">
                                                     Patient: {patient?.name || `ID ${doc.userId.substring(0, 6)}...`}
                                                 </p>
                                                 <p className="text-xs text-gray-500">
                                                     Uploaded: {formatDate(doc.$createdAt)}
                                                 </p>
                                                 {doc.description && <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">Desc: {doc.description}</p>}
                                             </div>
                                             <div className="flex-shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-1.5 mt-1">
                                                 <Button
                                                     asChild
                                                     variant="outline"
                                                     size="sm"
                                                     className="h-7 px-2 text-xs"
                                                     disabled={fileUrl === '#'}
                                                     title={fileUrl === '#' ? "Cannot get file URL" : "Download/View Document"}
                                                 >
                                                     <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                         <Download className="h-3 w-3 mr-1" /> View
                                                     </a>
                                                 </Button>
                                                  <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     className="h-7 px-2 text-xs text-green-700 hover:bg-green-100"
                                                     onClick={() => handleMarkReviewed(doc.$id)}
                                                     title="Mark as Reviewed (Placeholder)"
                                                 >
                                                      <CheckSquare className="h-3 w-3 mr-1" /> Review
                                                  </Button>
                                             </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                 <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                     Go to Full Review Queue (Coming Soon)
                 </Button>
            </CardContent>
        </Card>
    );
};

export default PendingReviewsCard;