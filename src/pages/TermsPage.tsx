// src/pages/TermsPage.tsx
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText } from 'lucide-react'; // Icon for terms

const TermsPage: React.FC = () => {
  // Get the current date for the "Last Updated" field
  const lastUpdatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <MainLayout>
      <div className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg border border-gray-200 rounded-lg overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-momcare-light to-white p-6 border-b border-gray-200">
              <CardTitle className="flex items-center text-2xl md:text-3xl font-bold text-momcare-primary">
                <FileText className="mr-3 h-7 w-7 flex-shrink-0" />
                Terms of Service
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1.5">
                Last Updated: {lastUpdatedDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 text-gray-700 leading-relaxed space-y-6">
              {/* Introduction */}
              <p className="text-base">
                Welcome to MomCare AI! These Terms of Service ("Terms") govern your access to and use of the MomCare AI website, mobile application, and related services (collectively, the "Service"). Please read these Terms carefully before using the Service. By accessing or using the Service, you agree to be bound by these Terms.
              </p>

              {/* Section 1 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">1. Acceptance of Terms</h2>
                <p className="text-sm">
                  By creating an account or using the Service in any way, you affirm that you are capable of entering into binding contracts, and you agree to comply with these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use the Service.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">2. Description of Service</h2>
                <p className="text-sm">
                  MomCare AI provides an AI-powered platform offering information, resources, appointment scheduling features, document management, and communication tools related to pregnancy and maternal health. The Service is intended for informational and organizational purposes only.
                </p>
                <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  <strong>Important Disclaimer:</strong> MomCare AI does not provide medical advice, diagnosis, or treatment. The information provided through the Service is not a substitute for professional medical advice from a qualified healthcare provider. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or accessed through the Service. If you think you may have a medical emergency, call your doctor or emergency services immediately.
                </p>
              </section>

              {/* Section 3 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">3. User Accounts</h2>
                <p className="text-sm">
                  To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and keep your account information updated. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              {/* Section 4 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">4. Use Restrictions</h2>
                <p className="text-sm">
                  You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You agree not to misuse the AI features or attempt to reverse engineer any part of the Service.
                </p>
                {/* Add more specific restrictions as needed */}
              </section>

              {/* Section 5 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">5. Intellectual Property</h2>
                <p className="text-sm">
                  The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of MomCare AI and its licensors.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">6. Disclaimers and Limitation of Liability</h2>
                <p className="text-sm">
                  The Service is provided on an "AS IS" and "AS AVAILABLE" basis. MomCare AI makes no warranties, express or implied, regarding the accuracy, reliability, or completeness of the content or the service itself. To the fullest extent permitted by law, MomCare AI disclaims all warranties.
                </p>
                 <p className="text-sm">
                  In no event shall MomCare AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.
                </p>
              </section>

              {/* Section 7 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">7. Changes to Terms</h2>
                <p className="text-sm">
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
                </p>
              </section>

              {/* Section 8 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">8. Contact Information</h2>
                <p className="text-sm">
                  If you have any questions about these Terms, please contact us at: <a href="mailto:support@momcare.ai" className="text-momcare-primary hover:underline">support@momcare.ai</a> (Replace with your actual contact email).
                </p>
              </section>

              <p className="text-xs text-gray-500 pt-4 border-t mt-8">
                <strong>Please Note:</strong> This is placeholder text. Consult with a legal professional to draft comprehensive and legally compliant Terms of Service for your specific application and jurisdiction.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TermsPage;