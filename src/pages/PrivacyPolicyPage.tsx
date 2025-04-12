// src/pages/PrivacyPolicyPage.tsx
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react'; // Icon for privacy

const PrivacyPolicyPage: React.FC = () => {
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
                <ShieldCheck className="mr-3 h-7 w-7 flex-shrink-0" />
                Privacy Policy
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1.5">
                Last Updated: {lastUpdatedDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 text-gray-700 leading-relaxed space-y-6">
              {/* Introduction */}
              <p className="text-base">
                MomCare AI ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and related services (collectively, the "Service"). Please read this policy carefully. By using the Service, you consent to the data practices described in this policy.
              </p>

              {/* Section 1 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">1. Information We Collect</h2>
                <p className="text-sm">We may collect information about you in various ways, including:</p>
                <ul className="list-disc list-outside pl-6 space-y-1 text-sm">
                  <li>
                    <strong>Personal Data:</strong> Information you provide directly, such as your name, email address, date of birth, pregnancy details (e.g., due date, weeks pregnant), health information (e.g., pre-existing conditions, health readings), medical document uploads, appointment details, and profile preferences.
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Information automatically collected when you use the Service, such as your IP address, browser type, operating system, device information, pages visited, features used, interaction times, and error logs.
                  </li>
                  <li>
                    <strong>AI Interaction Data:</strong> Anonymized or pseudonymized data related to your interactions with the AI chat feature to improve its performance and safety. We strive to minimize the collection of identifiable information in chat logs.
                  </li>
                  <li>
                    <strong>Location Data:</strong> If you use location-based features (like finding nearby hospitals), we may collect your precise or approximate location with your permission.
                  </li>
                  {/* Add Cookies/Tracking Technologies if applicable */}
                </ul>
                 <p className="text-sm font-medium text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
                    <strong>Sensitive Health Information:</strong> We understand the sensitivity of health data. We collect and process health information you provide only to offer the Service's features (e.g., tracking progress, providing relevant tips, storing records you upload) and take appropriate measures to protect it.
                 </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">2. How We Use Your Information</h2>
                <p className="text-sm">We use the information we collect for purposes including:</p>
                 <ul className="list-disc list-outside pl-6 space-y-1 text-sm">
                    <li>Providing, operating, and maintaining the Service.</li>
                    <li>Personalizing your experience (e.g., showing relevant milestones, tips).</li>
                    <li>Processing appointments and managing your schedule.</li>
                    <li>Storing and displaying your uploaded medical documents.</li>
                    <li>Communicating with you (e.g., confirmations, updates, support).</li>
                    <li>Improving the Service, including the AI models (using anonymized/aggregated data where possible).</li>
                    <li>Monitoring usage and analyzing trends.</li>
                    <li>Ensuring security and preventing fraud.</li>
                    <li>Complying with legal obligations.</li>
                 </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">3. How We Share Your Information</h2>
                <p className="text-sm">We do not sell your personal information. We may share information under the following circumstances:</p>
                 <ul className="list-disc list-outside pl-6 space-y-1 text-sm">
                    <li><strong>With Service Providers:</strong> We may share information with third-party vendors who perform services on our behalf (e.g., hosting, data analysis, cloud storage like Appwrite). These providers are obligated to protect your data.</li>
                    <li><strong>For Legal Reasons:</strong> If required by law, subpoena, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred.</li>
                    <li><strong>With Your Consent:</strong> We may share your information for other purposes with your explicit consent.</li>
                 </ul>
                 <p className="text-sm">We will <strong>not</strong> share your identifiable health information with third parties for marketing purposes without your explicit consent.</p>
              </section>

              {/* Section 4 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">4. Data Security</h2>
                <p className="text-sm">
                  We implement reasonable administrative, technical, and physical security measures designed to protect your information from unauthorized access, use, or disclosure. We leverage Appwrite's security features for database and storage protection, including role-based permissions. However, no internet transmission or electronic storage is 100% secure, so we cannot guarantee absolute security.
                </p>
              </section>

              {/* Section 5 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">5. Data Retention</h2>
                 <p className="text-sm">
                    We retain your personal information for as long as necessary to provide the Service, fulfill the purposes outlined in this policy, comply with our legal obligations, resolve disputes, and enforce our agreements. You can typically delete your account and associated data through the Service settings (Specify if this feature exists).
                 </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">6. Your Choices and Rights</h2>
                <p className="text-sm">
                  Depending on your jurisdiction, you may have rights regarding your personal information, such as the right to access, correct, delete, or restrict its processing. You can typically manage your profile information and some settings within the app. For other requests or to exercise your rights, please contact us.
                </p>
                {/* Add details on how users can exercise rights */}
              </section>

              {/* Section 7 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">7. Children's Privacy</h2>
                <p className="text-sm">
                  The Service is not intended for use by individuals under the age of 18 (or the age of majority in their jurisdiction). We do not knowingly collect personal information from children. If we become aware that we have collected such information, we will take steps to delete it.
                </p>
              </section>

              {/* Section 8 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">8. Changes to This Privacy Policy</h2>
                <p className="text-sm">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              {/* Section 9 */}
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-momcare-dark border-b pb-2">9. Contact Us</h2>
                <p className="text-sm">
                  If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:privacy@momcare.ai" className="text-momcare-primary hover:underline">privacy@momcare.ai</a> (Replace with your actual privacy contact email).
                </p>
              </section>

              <p className="text-xs text-gray-500 pt-4 border-t mt-8">
                <strong>Please Note:</strong> This is placeholder text and does not constitute legal advice. Consult with a legal professional specializing in privacy law (like GDPR, CCPA, HIPAA, etc., depending on your target audience and data handling) to create a policy that accurately reflects your data practices and complies with applicable regulations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default PrivacyPolicyPage;