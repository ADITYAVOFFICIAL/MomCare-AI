// src/pages/ContactPage.tsx

import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom'; // If needed for links within the page
import MainLayout from '@/components/layout/MainLayout'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast'; // Adjust path if needed
import {
  Mail, // Main icon for contact
  User,
  AtSign, // Specific icon for email field
  BookOpen, // For subject
  MessageSquare, // For message
  Send, // For submit button
  Loader2,
  Phone,
  MapPin,
  Clock, // For office hours
  Building, // For company name/address
  AlertTriangle, // For errors (though toast handles most)
} from 'lucide-react';

// Define subjects for the dropdown
const contactSubjects = [
  'General Inquiry',
  'Support Request',
  'Feedback & Suggestions',
  'Appointment Question',
  'Billing Issue',
  'Partnership Inquiry',
  'Other',
];

const ContactPage: React.FC = () => {
  // --- State for Form Fields ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // --- State for Form Submission ---
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // --- Form Submission Handler ---
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // --- Basic Validation ---
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields (Name, Email, Subject, Message).",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Simple email format check (consider a more robust regex for production)
    if (!/\S+@\S+\.\S+/.test(email)) {
        toast({
            title: "Invalid Email",
            description: "Please enter a valid email address.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }


    // --- Simulate API Call/Backend Submission ---
    // In a real app, replace this with your actual API call (e.g., using fetch or axios)
    // to send the data to your backend (like an Appwrite function or email service).
    // console.log('Submitting contact form:', { name, email, subject, message });

    try {
      // Replace with: await sendContactFormData({ name, email, subject, message });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

      // --- Success ---
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you shortly.",
        // Use 'default' or 'success' if available
        variant: "default",
      });
      // Reset form fields
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');

    } catch (error: any) {
      // --- Error Handling ---
      // console.error('Error submitting contact form:', error);
      toast({
        title: "Submission Failed",
        description: error?.message || "Could not send your message. Please try again later or use the contact details provided.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Use MainLayout, contact page is usually public (requireAuth=false)
    <MainLayout requireAuth={false}>
      <div className="bg-gradient-to-b from-white via-momcare-light/20 to-white dark:from-gray-900 dark:via-gray-800/20 dark:to-gray-900 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">

          {/* Page Header */}
          <div className="text-center mb-12 md:mb-16">
            <Mail className="mx-auto h-12 w-12 text-momcare-primary dark:text-momcare-accent mb-4" />
            <h1 className="text-4xl font-extrabold text-momcare-dark dark:text-momcare-light sm:text-5xl tracking-tight">
              Get In Touch
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Have questions, feedback, or need support? We'd love to hear from you. Fill out the form below or use our direct contact details.
            </p>
          </div>

          {/* Main Content Grid: Form + Contact Info */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 md:gap-12 items-start">

            {/* Column 1: Contact Form Card */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <CardHeader className="bg-gradient-to-r from-momcare-light/50 to-white dark:from-gray-700/50 dark:to-gray-800 p-6 border-b dark:border-gray-700/50">
                  <CardTitle className="flex items-center text-xl font-semibold text-momcare-primary dark:text-momcare-light">
                    <MessageSquare className="mr-2.5 h-5 w-5" />
                    Send us a Message
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    We typically respond within 24-48 business hours.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                  <CardContent className="p-6 space-y-6">
                    {/* Name Field */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <User className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" /> Your Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                        aria-label="Your Name"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <AtSign className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" /> Your Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                        aria-label="Your Email Address"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Subject Field */}
                    <div className="space-y-1.5">
                       <Label htmlFor="subject" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                         <BookOpen className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" /> Subject *
                       </Label>
                       <Select value={subject} onValueChange={setSubject} required disabled={isLoading}>
                         <SelectTrigger id="subject" className="w-full dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" aria-label="Select contact subject">
                           <SelectValue placeholder="Select a reason for contacting us" />
                         </SelectTrigger>
                         <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                           {contactSubjects.map((sub) => (
                             <SelectItem key={sub} value={sub} className="dark:hover:bg-gray-700">
                               {sub}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>

                    {/* Message Field */}
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MessageSquare className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" /> Your Message *
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Please describe your inquiry in detail..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        className="min-h-[150px] text-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                        maxLength={2000} // Optional: set a max length
                        aria-label="Your Message"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-right" aria-live="polite">{message.length}/2000</p>
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 border-t dark:border-gray-700/50">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full py-3 text-base bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark flex items-center justify-center gap-2"
                      disabled={isLoading}
                      aria-disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="h-5 w-5" /> Send Message</>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Column 2: Direct Contact Info Card */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 h-full"> {/* Added h-full */}
                <CardHeader className="bg-gradient-to-r from-momcare-light/50 to-white dark:from-gray-700/50 dark:to-gray-800 p-6 border-b dark:border-gray-700/50">
                  <CardTitle className="flex items-center text-xl font-semibold text-momcare-primary dark:text-momcare-light">
                    <Building className="mr-2.5 h-5 w-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Other ways to reach us.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {/* Email */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <AtSign className="h-5 w-5 text-momcare-secondary dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Email Us</h4>
                      <a href="mailto:support@momcare.ai" className="text-sm text-momcare-primary hover:text-momcare-dark dark:text-momcare-accent dark:hover:text-momcare-light underline break-all">
                        support@momcare.ai
                      </a>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">For support and general questions.</p>
                    </div>
                  </div>

                   {/* Phone (Optional) */}
                   <div className="flex items-start space-x-3">
                     <div className="flex-shrink-0 mt-1">
                       <Phone className="h-5 w-5 text-momcare-secondary dark:text-blue-400" />
                     </div>
                     <div>
                       <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Call Us</h4>
                       <a href="tel:SAMPLE" className="text-sm text-momcare-primary hover:text-momcare-dark dark:text-momcare-accent dark:hover:text-momcare-light underline">
                         SAMPLE NUMBER
                       </a>
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Mon-Fri, 9 AM - 5 PM (IST)</p>
                     </div>
                   </div>

                   {/* Address (Optional) */}
                   <div className="flex items-start space-x-3">
                     <div className="flex-shrink-0 mt-1">
                       <MapPin className="h-5 w-5 text-momcare-secondary dark:text-blue-400" />
                     </div>
                     <div>
                       <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Our Office (Optional)</h4>
                       <p className="text-sm text-gray-600 dark:text-gray-300">
                         INDIA
                       </p>
                       {/* <a href="#" target="_blank" rel="noopener noreferrer" className="text-xs text-momcare-primary hover:underline dark:text-momcare-accent">View on Map (Link)</a> */}
                     </div>
                   </div>

                   {/* Office Hours (Optional) */}
                   <div className="flex items-start space-x-3">
                     <div className="flex-shrink-0 mt-1">
                       <Clock className="h-5 w-5 text-momcare-secondary dark:text-blue-400" />
                     </div>
                     <div>
                       <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Business Hours</h4>
                       <p className="text-sm text-gray-600 dark:text-gray-300">
                         Monday - Friday: 9:00 AM - 5:00 PM (IST)<br/>
                         Saturday - Sunday: Closed
                       </p>
                     </div>
                   </div>
                </CardContent>
                 {/* Optional Footer for Social Links or other info */}
                 {/* <CardFooter className="p-6 border-t dark:border-gray-700/50">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Follow us on social media!</p>
                      // Add Social Icons Links here
                 </CardFooter> */}
              </Card>
            </div>

          </div> {/* End Grid */}
        </div> {/* End Container */}
      </div> {/* End Background */}
    </MainLayout>
  );
};

export default ContactPage;