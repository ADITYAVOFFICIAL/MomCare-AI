
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center">
              <Heart className="h-6 w-6 text-momcare-accent" />
              <span className="ml-2 text-lg font-bold text-momcare-primary">MomCare AI</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Supporting expectant mothers with AI-powered care and resources.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/resources" className="text-sm text-gray-600 hover:text-momcare-primary">
                  Blog Articles
                </Link>
              </li>
              <li>
                <Link to="/chat" className="text-sm text-gray-600 hover:text-momcare-primary">
                  AI Assistant
                </Link>
              </li>
              <li>
                <Link to="/forum" className="text-sm text-gray-600 hover:text-momcare-primary">
                  Community Forum
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase">Account</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-momcare-primary">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-gray-600 hover:text-momcare-primary">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/medicaldocs" className="text-sm text-gray-600 hover:text-momcare-primary">
                  Medical Documents
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/appointment" className="text-sm text-gray-600 hover:text-momcare-primary">
                  Book Appointment
                </Link>
              </li>
              <li>
                <a href="tel:+04446314300" className="text-sm text-gray-600 hover:text-momcare-primary">
                  24/7 Hotline
                </a>
              </li>
              <li>
                <Link to="/emergency" className="text-sm text-gray-600 hover:text-momcare-primary">
                  Emergency Services
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} MomCare AI. All rights reserved.
          </p>
          <p className="mt-2 text-xs text-gray-400 text-center max-w-2xl mx-auto">
            Disclaimer: MomCare AI provides informational support and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
