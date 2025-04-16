// src/pages/Doctor.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
// Remove unused UI imports if they are only used in child components now
// Keep Alert, Button etc. if used directly in DoctorPage layout
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, Ban, Home } from 'lucide-react';

// --- Import the new child components ---
import PatientSearchCard from '@/components/doctor/PatientSearchCard';
import DoctorAppointmentsCard from '@/components/doctor/DoctorAppointmentsCard';
import PendingReviewsCard from '@/components/doctor/PendingReviewsCard';

const REQUIRED_LABEL = 'doctor';

const DoctorPage: React.FC = () => {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        if (isAuthLoading) {
            setIsAuthorized(null);
            return;
        }
        if (!isAuthenticated) {
            // console.warn("DoctorPage: User not authenticated.");
            setIsAuthorized(false);
            navigate('/login');
            return;
        }
        const hasRequiredLabel = Array.isArray(user?.labels) && user.labels.includes(REQUIRED_LABEL);
        if (hasRequiredLabel) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
            toast({
                title: "Unauthorized Access",
                description: "You do not have permission to view this page.",
                variant: "destructive",
            });
            navigate('/dashboard');
        }
    }, [user, isAuthenticated, isAuthLoading, navigate, toast]);

    // --- Loading State ---
    if (isAuthLoading || isAuthorized === null) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                    <Loader2 className="h-16 w-16 animate-spin text-momcare-primary" />
                    <span className="ml-4 text-lg text-gray-600">Verifying access...</span>
                </div>
            </MainLayout>
        );
    }

    // --- Unauthorized State ---
    if (!isAuthorized) {
        return (
            <MainLayout>
                <div className="max-w-2xl mx-auto mt-20 p-8 text-center">
                    <Alert variant="destructive" className="text-center">
                        <Ban className="h-6 w-6 mx-auto mb-2" />
                        <AlertTitle className="text-xl font-bold">Access Denied</AlertTitle>
                        <AlertDescription className="mt-2">
                            You do not have the necessary permissions (<code>{REQUIRED_LABEL}</code> role) to access this page.
                            You are being redirected.
                        </AlertDescription>
                    </Alert>
                     <Button onClick={() => navigate('/dashboard')} className="mt-6" variant="outline">
                        <Home className="mr-2 h-4 w-4" /> Go to Dashboard
                    </Button>
                </div>
            </MainLayout>
        );
    }

    // --- Authorized Doctor Dashboard ---
    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Page Header */}
                <div className="mb-10 md:mb-12 border-b pb-4">
                    <h1 className="text-3xl font-extrabold text-momcare-dark sm:text-4xl tracking-tight">
                        Doctor Dashboard
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Welcome, Dr. {user?.name || 'User'}. Manage patients and appointments here.
                    </p>
                     <Alert variant="default" className="mt-4 bg-green-50 border-green-200 text-green-800 max-w-md">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <AlertTitle className="font-medium text-green-900">Access Confirmed</AlertTitle>
                      <AlertDescription className="text-xs">
                        Your <strong>{REQUIRED_LABEL}</strong> role grants access to this dashboard.
                      </AlertDescription>
                    </Alert>
                </div>

                {/* Functional Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"> {/* Use items-start */}

                    {/* Patient Search Card */}
                    <div className="lg:col-span-1"> {/* Adjust span if needed */}
                       <PatientSearchCard />
                    </div>

                    {/* Appointments Card */}
                     <div className="lg:col-span-1"> {/* Adjust span if needed */}
                        <DoctorAppointmentsCard />
                     </div>

                    {/* Pending Reviews Card */}
                     <div className="lg:col-span-1"> {/* Adjust span if needed */}
                        <PendingReviewsCard />
                    </div>

                </div>
            </div>
        </MainLayout>
    );
};

export default DoctorPage;