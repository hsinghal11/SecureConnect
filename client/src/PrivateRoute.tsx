// PrivateRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./Context/authContext.tsx";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (user) {
    return children;
  } else {
    return <Navigate to="/login" />;
  }
};

export default PrivateRoute;
