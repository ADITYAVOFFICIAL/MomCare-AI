
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
  Activity,
  Package,
  Salad,
  Gamepad2,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import Hero from '@/components/ui/Hero';
import { useQuery } from '@tanstack/react-query';   // <-- Import useQuery
import { getTotalUserCount } from '@/lib/appwrite';
import HomeCta from '@/components/ui/HomeCta'; 

const HomePage = () => {
  const {
    data: userCountData,
    isLoading: isLoadingUserCount,
    isError: isErrorUserCount,
    error: userCountError // Optional: get the actual error object
   } = useQuery({
    queryKey: ['totalUserCount'], // Unique key for this query cache
    queryFn: getTotalUserCount,    // The function that fetches the data
    refetchInterval: 60000, // Optional: Refetch every 60 seconds
    staleTime: 30000,       // Optional: Data fresh for 30 seconds
    retry: 1, // Optional: Retry once on failure
  });
  // -----------------------------------------

  // Helper function to render the user count display
  const renderUserCount = () => {
    if (isLoadingUserCount) {
      // Show a loading spinner
      return <Loader2 className="h-5 w-5 animate-spin text-momcare-primary inline-block" aria-label="Loading user count"/>;
    }

    if (isErrorUserCount) {
      // Show an error indicator
      // console.error("Error fetching user count:", userCountError); // Log the error for debugging
      return (
        <span className="font-medium flex items-center" title={userCountError instanceof Error ? userCountError.message : 'Could not load user count'}>
          <AlertCircle className="h-5 w-5 text-red-500 inline-block mr-1" /> --
        </span>
      );
    }

    if (userCountData && typeof userCountData.totalUsers === 'number') {
      // Format and display the count
      const formattedCount = new Intl.NumberFormat().format(userCountData.totalUsers);
      return <span className="font-medium">
      <span className="font-bold">{formattedCount}</span> Active Users
    </span>
    }

    // Fallback if data is somehow invalid (shouldn't normally happen with TS)
    return <span className="font-medium">-- Active Users</span>;
  };
  return (
    <MainLayout>
      {/* Hero Section */}
      <Hero />

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
                <span className="font-medium">{renderUserCount()}</span>
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
      <section className="py-16 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-momcare-primary dark:text-momcare-light">What We Offer</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              MomCare AI provides a comprehensive suite of tools and resources to support you throughout your pregnancy journey.
            </p>
          </div>
          
          {/* Updated Grid with more items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"> {/* Added xl:grid-cols-4 */}
            {/* AI Chat */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-momcare-primary dark:border-momcare-accent">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-momcare-primary dark:bg-momcare-accent text-white mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Chat Assistant</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Get personalized answers to your pregnancy questions anytime, tailored to your specific needs.
              </p>
              <Link to="/chat" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-momcare-primary dark:text-momcare-accent hover:text-momcare-dark dark:hover:text-momcare-light">
                Start chatting <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Appointment Scheduling */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-momcare-secondary dark:border-blue-500">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-momcare-secondary dark:bg-blue-500 text-white mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appointment Scheduling</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Easily book and manage appointments with healthcare providers for your prenatal care.
              </p>
              <Link to="/appointment" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-momcare-secondary dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                Book appointment <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Medical Document Management */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-momcare-accent dark:border-pink-500">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-momcare-accent dark:bg-pink-500 text-white mb-4">
                <FilePlus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Medical Document Management</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Securely store and manage your medical records, scans, and test results in one place.
              </p>
              <Link to="/medicaldocs" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-momcare-accent dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300">
                Manage documents <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Emergency Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-red-500 dark:border-red-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-500 dark:bg-red-600 text-white mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Emergency Information</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Quick access to emergency contacts, warning signs, and nearby hospitals when needed most.
              </p>
              <Link to="/emergency" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                View emergency info <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Resources & Blog */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-green-500 dark:border-green-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 dark:bg-green-600 text-white mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resources & Blog</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Access informative articles, tips, and resources about pregnancy, childbirth, and early motherhood.
              </p>
              <Link to="/resources" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                Explore resources <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            
            {/* Personalized Dashboard */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-purple-500 dark:border-purple-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 dark:bg-purple-600 text-white mb-4">
                <Baby className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personalized Dashboard</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Track your pregnancy journey with a personalized dashboard showing important milestones and reminders.
              </p>
              <Link to="/dashboard" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                View dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {/* Community Forum */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-orange-500 dark:border-orange-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 dark:bg-orange-600 text-white mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Community Forum</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Connect with other expectant mothers, share experiences, and find support in our community.
              </p>
              <Link to="/forum" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
                Join the discussion <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {/* Product Suggestions */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-indigo-500 dark:border-indigo-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white mb-4">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI Product Suggestions</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Discover helpful products for pregnancy and baby care, recommended by AI based on your profile or needs.
              </p>
              <Link to="/products" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                Find products <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {/* Meal & Exercise Ideas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-teal-500 dark:border-teal-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-teal-500 dark:bg-teal-600 text-white mb-4">
                <Salad className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Meal & Exercise Ideas</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Receive personalized meal plans and safe exercise suggestions tailored to your pregnancy stage and preferences.
              </p>
              <Link to="/meals" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-teal-500 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300">
                Get ideas <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {/* Blockchain Stacking Game */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg border-t-4 border-cyan-500 dark:border-cyan-600">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-cyan-500 dark:bg-cyan-600 text-white mb-4">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Stacking Game (on Monad)</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                Play our fun stacking game, test your skills, and submit your high score to the Monad blockchain leaderboard.
              </p>
              <Link to="/games" onClick={() => window.scrollTo(0, 0)} className="mt-4 inline-flex items-center text-sm font-medium text-cyan-500 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">
                Play the game <ArrowRight className="ml-1 h-4 w-4" />
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
      <HomeCta />
      
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
       {/* --- NEW: Pricing Section --- */}
       <section className="py-16 md:py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Tag className="mx-auto h-10 w-10 text-momcare-secondary mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold text-momcare-primary dark:text-momcare-light tracking-tight mb-4">
            Find the Perfect Plan
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Whether you're just starting or need comprehensive support, we have a plan that fits your needs. Explore our flexible pricing options.
          </p>
          <Button size="lg" className="bg-momcare-secondary hover:bg-momcare-secondary/90 text-white text-lg px-8 py-3" asChild>
            <Link to="/pricing" onClick={() => window.scrollTo(0, 0)}>
              View Pricing Plans <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
      {/* --- End Pricing Section --- */}
    </MainLayout>
  );
};

export default HomePage;