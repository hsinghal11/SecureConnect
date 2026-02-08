// AuthContext.tsx
import BASE_URL from "@/BackendUrl";
import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext<{
  user: any;
  setUser: (user: any) => void;
  logout: () => void;
  isLoading: boolean;
}>({
  user: null,
  setUser: () => { },
  logout: () => { },
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userPrivateKey");
    localStorage.removeItem("userSigningPrivateKey");
    setUser(null);
  };

  // Check if token exists on load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const userData = localStorage.getItem("user");

        if (token && userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Then verify token with backend
            const response = await fetch(`${BASE_URL}/api/v1/user/verify`, {
              headers: {
                "Authorization": `Bearer ${token}`
              },
              credentials: 'include'
            });
            const data = await response.json();

            if (response.ok) {
              setUser(data.user);
            } else {
              console.error("Token verification failed:", data.message);
              // Token is invalid, clear everything
              localStorage.removeItem("authToken");
              localStorage.removeItem("user");
              localStorage.removeItem("userPrivateKey");
              localStorage.removeItem("userSigningPrivateKey");
              setUser(null);
            }
          } catch (error) {
            console.error("Auth verification error:", error);
            // Clear invalid data
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            localStorage.removeItem("userPrivateKey");
            localStorage.removeItem("userSigningPrivateKey");
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth
export const useAuth = () => useContext(AuthContext);
