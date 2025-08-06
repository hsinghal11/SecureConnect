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
import { useNavigate } from "react-router-dom";
import { useState, type ChangeEvent } from "react";
import { generateKeyPair, exportKeyToPem } from "@/lib/cryptoUtils"; // Import crypto utils
import BASE_URL from "@/BackendUrl";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pic, setPic] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for loading indicator
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error messages
  // New states for key display and confirmation
  const [privateKeyPem, setPrivateKeyPem] = useState<string | null>(null);
  const [signingPrivateKeyPem, setSigningPrivateKeyPem] = useState<string | null>(null);
  const [publicKeyPem, setPublicKeyPem] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [keysConfirmed, setKeysConfirmed] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setPic(event.target.files[0]);
    } else {
      setPic(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    setIsSubmitting(true); // Set loading state
    setErrorMessage(null); // Clear previous errors

    try {
      // 1. Generate key pairs
      const keys = await generateKeyPair();
      
      // Export ALL keys to PEM format from the SAME key pair
      const privateKeyPemValue = await exportKeyToPem(keys.privateKey, "private");
      const signingPrivateKeyPemValue = await exportKeyToPem(keys.signingPrivateKey, "private");
      const publicKeyPemValue = await exportKeyToPem(keys.publicKey, "public");
      
      // Store all keys
      setPrivateKeyPem(privateKeyPemValue);
      setSigningPrivateKeyPem(signingPrivateKeyPemValue);
      setPublicKeyPem(publicKeyPemValue);
      
      setShowKeys(true);
      setIsSubmitting(false);
      // Do not proceed until user confirms
      return;
    } catch (error) {
      setErrorMessage(
        `An error occurred during key generation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsSubmitting(false);
      return;
    }
  };

  // This function is called after user confirms they have saved their keys
  const handleConfirmKeysAndRegister = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (!privateKeyPem || !signingPrivateKeyPem || !publicKeyPem) {
        setErrorMessage("Keys are missing. Please refresh and try again.");
        setIsSubmitting(false);
        return;
      }
      
      // Store both private keys securely in localStorage
      localStorage.setItem("userPrivateKey", privateKeyPem); // For decryption (future use)
      localStorage.setItem("userSigningPrivateKey", signingPrivateKeyPem); // For signing
      
      // Prepare FormData for sending data including the file
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("name", name);
      formData.append("publicKey", publicKeyPem); // Use the stored public key from the same key pair
      if (pic) {
        formData.append("avatar", pic); // Append the File object if it exists
      }
      
      // 3. Send data to your backend
      const response = await fetch(`${BASE_URL}/api/v1/user/register`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        alert("Signup successful! Please login.");
        navigate("/login"); // Redirect to login after successful signup
      } else {
        setErrorMessage(
          data.message || "Registration failed. Please try again."
        );
      }
    } catch (error) {
      setErrorMessage(
        `An error occurred during registration: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const login = () => {
    console.log("Navigating to login...");
    navigate("/login");
  };

  return (
    <>
      <div className="w-full h-screen flex justify-center items-center bg-gradient-to-br from-yellow-100 to-rose-200">
        <Card className="w-full max-w-xl ">
          <CardHeader>
            <CardTitle>Signup to your account</CardTitle>
            <CardDescription>
              Enter your details below to create your account
            </CardDescription>
            <CardAction>
              <Button variant="link" onClick={login}>
                Login
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {/* Show keys modal/section if showKeys is true */}
            {showKeys ? (
              <div className="mb-6 p-4 border border-yellow-400 bg-yellow-50 rounded">
                <h2 className="font-bold text-lg mb-2 text-yellow-700">
                  Save Your Private Keys
                </h2>
                <p className="mb-2 text-yellow-700">
                  Please <b>copy and save</b> your private keys below. You will
                  need to provide them when logging in.{" "}
                  <b>We cannot recover these keys for you.</b>
                </p>
                <div className="mb-2">
                  <label className="font-semibold">
                    Encryption Private Key:
                  </label>
                  <textarea
                    className="w-full p-2 border rounded bg-gray-100 text-xs"
                    rows={4}
                    value={privateKeyPem || ""}
                    readOnly
                  />
                </div>
                <div className="mb-2">
                  <label className="font-semibold">Signing Private Key:</label>
                  <textarea
                    className="w-full p-2 border rounded bg-gray-100 text-xs"
                    rows={4}
                    value={signingPrivateKeyPem || ""}
                    readOnly
                  />
                </div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="confirmKeys"
                    checked={keysConfirmed}
                    onChange={(e) => setKeysConfirmed(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="confirmKeys" className="text-yellow-800">
                    I have saved both private keys securely.
                  </label>
                </div>
                <Button
                  className="w-full mt-2"
                  disabled={!keysConfirmed || isSubmitting}
                  onClick={handleConfirmKeysAndRegister}
                >
                  Continue Registration
                </Button>
                {errorMessage && (
                  <p className="text-red-500 text-m mt-2">{errorMessage}</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your Name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pic">Profile Picture (Optional)</Label>
                    <Input
                      id="pic"
                      type="file"
                      name="avatar"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                <CardFooter className="flex-col gap-2 mt-6">
                  {errorMessage && (
                    <p className="text-red-500 text-m">{errorMessage}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing Up..." : "Sign Up"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={login}
                    disabled={isSubmitting}
                  >
                    Already have an account?
                  </Button>
                </CardFooter>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
