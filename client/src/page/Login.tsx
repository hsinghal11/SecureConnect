import BASE_URL from "@/BackendUrl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/authContext";


export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // New states for private key inputs
  const [privateKey, setPrivateKey] = useState<string>("");
  const [signingPrivateKey, setSigningPrivateKey] = useState<string>("");

  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async () => {
    setIsLoggingIn(true); // Set loading state
    setErrorMessage(null); // Clear previous errors

    // Require both keys
    if (!privateKey.trim() || !signingPrivateKey.trim()) {
      setErrorMessage("Both private keys are required for login.");
      setIsLoggingIn(false);
      return;
    }

    // Validate that keys look like PEM format
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || 
        !signingPrivateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      setErrorMessage("Invalid private key format. Please ensure you're pasting the complete PEM keys.");
      setIsLoggingIn(false);
      return;
    }

    try {
      // 1. Authenticate with backend (email/password)
      const response = await fetch(`${BASE_URL}/api/v1/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if(response.ok){
        console.log("Login successful - Setting user data:", data.user);
        
        // Store authentication data
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Store the private keys in localStorage
        localStorage.setItem("userPrivateKey", privateKey.trim());
        localStorage.setItem("userSigningPrivateKey", signingPrivateKey.trim());
        
        // Verify keys were saved correctly
        const savedPrivateKey = localStorage.getItem("userPrivateKey");
        const savedSigningKey = localStorage.getItem("userSigningPrivateKey");
        
        console.log("Private keys saved to localStorage:", {
          encryptionKeySaved: !!savedPrivateKey,
          signingKeySaved: !!savedSigningKey,
          encryptionKeyLength: savedPrivateKey?.length,
          signingKeyLength: savedSigningKey?.length
        });
        
        if (!savedPrivateKey || !savedSigningKey) {
          setErrorMessage("Failed to save private keys to localStorage. Please try again.");
          setIsLoggingIn(false);
          return;
        }
        
        // Update the auth context with user data
        setUser(data.user);
        console.log("Login - User state updated, navigating to dashboard");
        navigate('/dashboard'); 
      }else {
        setErrorMessage(data.message || "Login failed. Please check your credentials.");
      }
    }catch (error) {
      console.error("Login error:", error);
      setErrorMessage(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoggingIn(false);
    }
  }

  const signUp = () => {
    console.log("clicked to kara h");
    navigate("/signUp");
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-gradient-to-br from-rose-100 via-orange-100 to-yellow-200">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
          <CardAction>
            <Button variant="link" onClick={signUp}>
              Sign Up
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {/* New fields for private keys */}
              <div className="grid gap-2">
                <Label htmlFor="privateKey">Encryption Private Key</Label>
                <textarea
                  id="privateKey"
                  className="w-full p-2 border rounded bg-gray-100 text-xs"
                  rows={3}
                  placeholder="Paste your encryption private key here"
                  value={privateKey}
                  onChange={e => setPrivateKey(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signingPrivateKey">Signing Private Key</Label>
                <textarea
                  id="signingPrivateKey"
                  className="w-full p-2 border rounded bg-gray-100 text-xs"
                  rows={3}
                  placeholder="Paste your signing private key here"
                  value={signingPrivateKey}
                  onChange={e => setSigningPrivateKey(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2 mt-6">
          {errorMessage && (
            <p className="text-red-500 text-m">{errorMessage}</p>
          )}
          <Button type="submit" className="w-full hover:cursor-pointer" disabled={isLoggingIn} onClick={handleLogin} >
            {isLoggingIn ? "logging  In..." : "Login"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={signUp}
            disabled={isLoggingIn}
          >
            Create an account?
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
