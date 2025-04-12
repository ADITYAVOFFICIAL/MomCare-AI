// src/pages/MedicalDocsPage.tsx (or wherever this component lives)
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Upload,
  Loader2,
  File,
  Trash2,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  uploadMedicalDocument,
  getUserMedicalDocuments,
  getFilePreview,
  // --- FIX: Import deleteMedicalDocument instead of deleteFile ---
  deleteMedicalDocument,
  // --- FIX: Import the type for better type safety ---
  MedicalDocument,
  medicalBucketId // Keep this as it's needed for getFilePreview
} from '@/lib/appwrite'; // Adjust path if necessary
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MedicalDocsPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // --- FIX: Use the imported MedicalDocument type ---
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null);
  const [fileToDelete, setFileToDelete] = useState<MedicalDocument | null>(null);
  // --- End Fix ---
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // getUserMedicalDocuments already returns MedicalDocument[]
      const docs = await getUserMedicalDocuments(user.$id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Failed to fetch documents",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) { // Ensure user object exists
      fetchDocuments();
    }
  }, [isAuthenticated, user]); // Add user to dependency array

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    } else {
      setFile(null); // Reset if no file selected
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);

    try {
      await uploadMedicalDocument(file, user.$id);

      setFile(null);
      toast({
        title: "Document uploaded successfully",
        description: `${file.name} has been uploaded.`,
      });

      // Reset file input more reliably
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh document list
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        // Provide more context if possible, but avoid leaking sensitive info
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // --- FIX: Use the MedicalDocument type for the parameter ---
  const handleViewDocument = (document: MedicalDocument) => {
    setSelectedDocument(document);
  };

  // --- FIX: Use the MedicalDocument type for the parameter ---
  const handleDeleteDocument = (document: MedicalDocument) => {
    setFileToDelete(document);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      // --- FIX: Call the correct function from appwrite.ts ---
      // Pass the entire document object as required by deleteMedicalDocument
      await deleteMedicalDocument(fileToDelete);
      // --- End Fix ---

      // Remove from list optimistically
      setDocuments(documents.filter(doc => doc.$id !== fileToDelete.$id));

      toast({
        title: "Document deleted",
        description: "The document has been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
      // Optional: Refetch documents if delete failed to ensure UI consistency
      // fetchDocuments();
    } finally {
      setFileToDelete(null); // Close the confirmation dialog
    }
  };

  // Helper function remains the same
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper function remains the same
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Helper function remains the same
  const getDocumentIconByType = (mimeType: string = ''): JSX.Element => {
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.startsWith('image/')) return <File className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // Helper function to safely get file preview URL
  const getSafeFilePreviewUrl = (fileId: string | undefined, bucketId: string): string => {
    if (!fileId) return '';
    try {
      // getFilePreview now returns a URL object, convert to string for src/href
      return getFilePreview(fileId, bucketId).toString();
    } catch (error) {
      console.error("Error getting preview URL:", error);
      return ''; // Return empty string or a placeholder URL
    }
  };


  return (
    <MainLayout requireAuth={true}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-momcare-primary">Medical Documents</h1>
          <p className="text-gray-600 mt-2">
            Securely store and manage your medical records, scans, and test results
          </p>
        </div>

        {/* Upload Card */}
        <Card className="border-momcare-primary/20 mb-8">
          <CardHeader className="bg-momcare-light">
            <CardTitle className="flex items-center text-momcare-primary">
              <Upload className="mr-2 h-5 w-5" />
              Upload New Document
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-upload">Select Document</Label>
                <Input
                  id="document-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer file:mr-4 file:py-2 file:px-4
                             file:rounded-full file:border-0
                             file:text-sm file:font-semibold
                             file:bg-momcare-light file:text-momcare-primary
                             hover:file:bg-momcare-primary/10"
                />
                <p className="text-xs text-gray-500">
                  Accepted file types: PDF, JPG, PNG, etc. (Check Appwrite bucket settings for limits)
                </p>
              </div>

              {file && (
                <div className="bg-gray-50 p-3 rounded-md flex items-center justify-between border border-gray-200">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <FileText className="h-5 w-5 text-momcare-primary flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-medium truncate text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  {/* Optional: Add a button to clear the selected file */}
                   <Button variant="ghost" size="sm" onClick={() => {
                       setFile(null);
                       const fileInput = document.getElementById('document-upload') as HTMLInputElement;
                       if (fileInput) fileInput.value = '';
                   }}>Clear</Button>
                </div>
              )}

              <Button
                onClick={handleUpload}
                className="w-full bg-momcare-primary hover:bg-momcare-dark"
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents List Card */}
        <Card className="border-momcare-primary/20">
          <CardHeader className="bg-momcare-light">
            <CardTitle className="flex items-center text-momcare-primary">
              <FileText className="mr-2 h-5 w-5" />
              Your Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-momcare-primary animate-spin mb-4" />
                <p className="text-gray-600">Loading your documents...</p>
              </div>
            ) : documents.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.$id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {getDocumentIconByType(doc.documentType)}
                            <span className="ml-2 truncate max-w-[200px] sm:max-w-[300px]">{doc.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{doc.documentType?.split('/')[1]?.toUpperCase() || 'Unknown'}</TableCell>
                        <TableCell>{formatDate(doc.$createdAt)}</TableCell>
                        <TableCell className="text-right space-x-1 sm:space-x-2">
                          {/* View Dialog */}
                          <Dialog onOpenChange={(open) => !open && setSelectedDocument(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDocument(doc)}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl w-[90vw]">
                              <DialogHeader>
                                <DialogTitle className="truncate">{selectedDocument?.fileName}</DialogTitle>
                                <DialogDescription>
                                  Uploaded on {selectedDocument && formatDate(selectedDocument.$createdAt)}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="mt-4 max-h-[70vh] overflow-auto border rounded-md p-2 bg-gray-50">
                                {selectedDocument && (
                                  selectedDocument.documentType?.startsWith('image/') ? (
                                    <img
                                      src={getSafeFilePreviewUrl(selectedDocument.fileId, medicalBucketId)}
                                      alt={selectedDocument.fileName}
                                      className="max-w-full h-auto mx-auto"
                                      onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; /* Add a placeholder */}}
                                    />
                                  ) : selectedDocument.documentType?.includes('pdf') ? (
                                    <iframe
                                      src={getSafeFilePreviewUrl(selectedDocument.fileId, medicalBucketId)}
                                      className="w-full h-[65vh]"
                                      title={selectedDocument.fileName}
                                    />
                                  ) : (
                                    <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                      <p>Preview not available for this file type.</p>
                                      <p className="text-sm text-gray-500 mt-2">({selectedDocument.documentType || 'Unknown type'})</p>
                                      <Button asChild variant="link" className="mt-4">
                                        <a
                                          href={getSafeFilePreviewUrl(selectedDocument.fileId, medicalBucketId)}
                                          download={selectedDocument.fileName}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          Download file to view
                                        </a>
                                      </Button>
                                    </div>
                                  )
                                )}
                              </div>

                              <DialogFooter className="mt-4">
                                <Button asChild variant="outline">
                                  <a
                                    href={getSafeFilePreviewUrl(selectedDocument?.fileId, medicalBucketId)}
                                    download={selectedDocument?.fileName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    // Disable if URL is invalid
                                    className={!getSafeFilePreviewUrl(selectedDocument?.fileId, medicalBucketId) ? "pointer-events-none opacity-50" : ""}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </a>
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Delete Alert Dialog */}
                          <AlertDialog onOpenChange={(open) => !open && setFileToDelete(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the document "{fileToDelete?.fileName}"? This action cannot be undone and will permanently remove the file and its record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No documents yet</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Upload your medical documents, scan results, or any health records to keep them organized and accessible.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Note */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
          <AlertTriangle className="h-6 w-6 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800">Privacy Note</h3>
            <p className="text-amber-700 text-sm mt-1">
              Your medical documents are securely stored using Appwrite's storage and database services. Access permissions should be configured in Appwrite to ensure only authorized users (like yourself) can view or modify them. We use industry-standard encryption where applicable.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default MedicalDocsPage;