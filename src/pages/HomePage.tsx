
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Calendar, 
  FilePlus, 
  AlertTriangle, 
  BookOpen,
  ArrowRight, 
  Heart,
  Baby,
  CheckCircle,
  BellRing,
  ShieldCheck,
  Sparkles,
  Users,
  UserPlus,
  Activity
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const HomePage = () => {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-50 via-blue-50 to-pink-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-1/2 md:pr-12">
              <h1 className="text-4xl md:text-5xl font-bold text-momcare-primary tracking-tight relative">
                Welcome to <span className="text-momcare-accent">MomCare AI</span>
                <span className="absolute -top-6 right-24 text-momcare-accent opacity-20 text-7xl font-bold">♡</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-gray-700 leading-relaxed">
                Your AI-powered companion throughout your pregnancy journey. Get personalized support, access to resources, and connect with care providers.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg" className="bg-momcare-primary hover:bg-momcare-dark text-white shadow-lg hover:shadow-xl transition-all" asChild>
                  <Link to="/chat">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Chat with AI
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-momcare-primary text-momcare-primary hover:bg-momcare-light hover:text-momcare-dark transition-all" asChild>
                  <Link to="/signup">
                    <Heart className="mr-2 h-5 w-5" />
                    Join MomCare
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-10 md:mt-0 md:w-1/2">
              <div className="relative">
                <div className="absolute -top-5 -left-5 w-24 h-24 bg-momcare-light rounded-full opacity-50 z-0"></div>
                <div className="absolute -bottom-5 -right-5 w-24 h-24 bg-momcare-light rounded-full opacity-50 z-0"></div>
                <img
                  src="https://images.unsplash.com/photo-1519791883288-dc8bd696e667?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Pregnant woman"
                  className="w-full h-auto rounded-2xl shadow-xl z-10 relative"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider text-gray-500 mb-4">Trusted by expectant mothers</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              <div className="flex items-center space-x-2 text-gray-700">
                <ShieldCheck className="h-5 w-5 text-momcare-primary" />
                <span className="font-medium">HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-momcare-primary" />
                <span className="font-medium">XX Active Users</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-700">
                <Sparkles className="h-5 w-5 text-momcare-primary" />
                <span className="font-medium">AI Powered Advice</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-momcare-primary">What We Offer</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              MomCare AI provides a comprehensive suite of tools and resources to support you throughout your pregnancy journey.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Chat */}
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-momcare-primary">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-momcare-primary text-white mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">AI Chat Assistant</h3>
              <p className="mt-2 text-gray-600">
                Get personalized answers to your pregnancy questions anytime, tailored to your specific needs.
              </p>
              <Link to="/chat" className="mt-4 inline-flex items-center text-momcare-primary hover:text-momcare-dark">
                Start chatting <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Appointment Scheduling */}
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-momcare-secondary">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-momcare-secondary text-white mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Appointment Scheduling</h3>
              <p className="mt-2 text-gray-600">
                Easily book and manage appointments with healthcare providers for your prenatal care.
              </p>
              <Link to="/appointment" className="mt-4 inline-flex items-center text-momcare-secondary hover:text-blue-700">
                Book appointment <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Medical Document Management */}
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-momcare-accent">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-momcare-accent text-white mb-4">
                <FilePlus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Medical Document Management</h3>
              <p className="mt-2 text-gray-600">
                Securely store and manage your medical records, scans, and test results in one place.
              </p>
              <Link to="/medicaldocs" className="mt-4 inline-flex items-center text-momcare-accent hover:text-pink-700">
                Manage documents <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Emergency Info */}
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-red-500">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-500 text-white mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Emergency Information</h3>
              <p className="mt-2 text-gray-600">
                Quick access to emergency contacts, warning signs, and nearby hospitals when needed most.
              </p>
              <Link to="/emergency" className="mt-4 inline-flex items-center text-red-500 hover:text-red-700">
                View emergency info <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Resources & Blog */}
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-green-500">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Resources & Blog</h3>
              <p className="mt-2 text-gray-600">
                Access informative articles, tips, and resources about pregnancy, childbirth, and early motherhood.
              </p>
              <Link to="/resources" className="mt-4 inline-flex items-center text-green-500 hover:text-green-700">
                Explore resources <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Personalized Dashboard */}
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-purple-500">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mb-4">
                <Baby className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Personalized Dashboard</h3>
              <p className="mt-2 text-gray-600">
                Track your pregnancy journey with a personalized dashboard showing important milestones and reminders.
              </p>
              <Link to="/dashboard" className="mt-4 inline-flex items-center text-purple-500 hover:text-purple-700">
                View dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-orange-500">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Community Forum</h3>
              <p className="mt-2 text-gray-600">
                Connect with other expectant mothers, share experiences, and find support in our community.
              </p>
              <Link to="/forum" className="mt-4 inline-flex items-center text-orange-500 hover:text-orange-700">
                Join the discussion <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-hidden"> {/* Subtle gradient change, added overflow */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-momcare-primary tracking-tight">How MomCare AI Works</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to begin your personalized pregnancy support journey.
            </p>
          </div>

          {/* Using Flexbox for better alignment and potential connector elements if needed later */}
          <div className="relative">
             {/* Optional: Add subtle connecting lines for desktop - requires more CSS */}
            {/* <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-momcare-primary/20 -translate-y-1/2 z-0"></div> */}

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"> {/* Increased gap */}

              {/* Step 1 Card */}
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 flex flex-col text-center h-full border-t-4 border-momcare-primary"> {/* Added hover, flex, border */}
                <div className="flex-shrink-0 mb-4">
                   <div className="flex items-center justify-center h-16 w-16 rounded-full bg-momcare-light text-momcare-primary mx-auto mb-4 border-2 border-momcare-primary font-bold text-2xl">
                     1
                   </div>
                   <UserPlus className="mx-auto h-10 w-10 text-momcare-primary" /> {/* Icon Added */}
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your Profile</h3>
                  <p className="text-gray-600">
                    Sign up easily and provide some basic details about your pregnancy and health history to personalize your experience.
                  </p>
                </div>
              </div>

              {/* Step 2 Card */}
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 flex flex-col text-center h-full border-t-4 border-momcare-secondary"> {/* Added hover, flex, border */}
                 <div className="flex-shrink-0 mb-4">
                   <div className="flex items-center justify-center h-16 w-16 rounded-full bg-momcare-light text-momcare-primary mx-auto mb-4 border-2 border-momcare-primary font-bold text-2xl">
                     2
                   </div>
                   <Sparkles className="mx-auto h-10 w-10 text-momcare-secondary" /> {/* Icon Added */}
                 </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Personalized Care</h3>
                  <p className="text-gray-600">
                    Interact with our AI assistant, explore tailored resources, schedule appointments, and manage your health data securely.
                  </p>
                </div>
              </div>

              {/* Step 3 Card */}
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 flex flex-col text-center h-full border-t-4 border-momcare-accent"> {/* Added hover, flex, border */}
                 <div className="flex-shrink-0 mb-4">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-momcare-light text-momcare-primary mx-auto mb-4 border-2 border-momcare-primary font-bold text-2xl">
                      3
                    </div>
                   <Activity className="mx-auto h-10 w-10 text-momcare-accent" /> {/* Icon Added */}
                 </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Stay Informed & Prepared</h3>
                  <p className="text-gray-600">
                    Receive timely reminders, track milestones on your dashboard, and access helpful guides for every stage of your journey.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-16 bg-momcare-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-momcare-primary">What Mothers Say</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Hear from expectant mothers who have benefited from MomCare AI's support.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-momcare-primary flex items-center justify-center text-white">
                  <span className="font-bold">S</span>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold">Sarah J.</h4>
                  <p className="text-sm text-gray-500">28 weeks pregnant</p>
                </div>
              </div>
              <p className="text-gray-600 border-l-4 border-momcare-light pl-4 italic">
                "The AI chat has been incredibly helpful for those middle-of-the-night questions. I love how it remembers my history and gives me personalized advice."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-momcare-accent flex items-center justify-center text-white">
                  <span className="font-bold">M</span>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold">Maria T.</h4>
                  <p className="text-sm text-gray-500">35 weeks pregnant</p>
                </div>
              </div>
              <p className="text-gray-600 border-l-4 border-momcare-light pl-4 italic">
                "Being able to store all my medical documents in one secure place has made it so much easier to stay organized throughout my pregnancy."
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-momcare-secondary flex items-center justify-center text-white">
                  <span className="font-bold">R</span>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold">Rebecca L.</h4>
                  <p className="text-sm text-gray-500">First-time mom</p>
                </div>
              </div>
              <p className="text-gray-600 border-l-4 border-momcare-light pl-4 italic">
                "The emergency information section gave me peace of mind, especially when traveling. Knowing nearby hospitals and warning signs is reassuring."
              </p>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-momcare-primary to-momcare-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Start Your MomCare Journey Today</h2>
          <p className="mt-4 text-lg max-w-3xl mx-auto">
            Join thousands of expectant mothers who trust MomCare AI for support throughout their pregnancy journey.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="bg-white text-momcare-primary hover:bg-gray-100" asChild>
              <Link to="/signup">
                Create Free Account
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white bg-momcare-primary hover:bg-momcare-dark" asChild>
              <Link to="/chat">
                <MessageSquare className="mr-2 h-5 w-5" />
                Try AI Chat
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Highlights */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-momcare-primary" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Expert-Guided AI</h3>
                <p className="mt-2 text-gray-600">
                  Our AI is developed with healthcare professionals to ensure accurate advice.
                </p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0">
                <BellRing className="h-6 w-6 text-momcare-primary" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Timely Reminders</h3>
                <p className="mt-2 text-gray-600">
                  Get personalized reminders for appointments, tests, and important milestones.
                </p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0">
                <Heart className="h-6 w-6 text-momcare-primary" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Compassionate Support</h3>
                <p className="mt-2 text-gray-600">
                  Designed with empathy to support mothers through the emotional journey of pregnancy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;
