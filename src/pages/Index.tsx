
import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to the homepage
  return <Navigate to="/dashboard" replace />;
};

export default Index;
