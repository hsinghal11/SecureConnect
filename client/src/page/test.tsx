import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "@/BackendUrl";
import {
  encryptMessage,
  decryptMessage,
  importKeyFromPem,
  generateKeyPair,
} from '@/lib/cryptoUtils';

const TestPage = () => {
  const [testMessage, setTestMessage] = useState("Hello, this is a test message!");
  const [encryptedMessage, setEncryptedMessage] = useState("");
  const [decryptedMessage, setDecryptedMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [userPublicKey, setUserPublicKey] = useState<CryptoKey | null>(null);
  const [userPrivateKey, setUserPrivateKey] = useState<CryptoKey | null>(null);
  // userSigningKey removed

  // New keys for testing
  const [newPublicKey, setNewPublicKey] = useState<CryptoKey | null>(null);
  const [newPrivateKey, setNewPrivateKey] = useState<CryptoKey | null>(null);
  // newSigningKey removed

  const token = localStorage.getItem("authToken");

  // Load user keys on component mount
  useEffect(() => {
    loadUserKeys();
  }, []);

  const loadUserKeys = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Get current user info
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setError("No user found in localStorage");
        return;
      }

      const user = JSON.parse(userStr);
      console.log("Current user:", user);

      // Get public key from backend
      console.log("Fetching public key from backend...");
      const publicKeyResponse = await axios.get(
        `${BASE_URL}/api/v1/user/public-key/${user.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Public key response:", publicKeyResponse.data);
      let publicKeyPem = null;

      if (publicKeyResponse.data.success) {
        if (publicKeyResponse.data.data?.publicKey) {
          publicKeyPem = publicKeyResponse.data.data.publicKey;
        } else if (publicKeyResponse.data.publicKey) {
          publicKeyPem = publicKeyResponse.data.publicKey;
        } else if (publicKeyResponse.data.data) {
          publicKeyPem = publicKeyResponse.data.data;
        }
      } else if (publicKeyResponse.data.publicKey) {
        publicKeyPem = publicKeyResponse.data.publicKey;
      }

      if (!publicKeyPem) {
        setError("Failed to get public key from backend");
        return;
      }

      console.log("Public key PEM:", publicKeyPem);

      // Get private keys from localStorage
      const privateKeyPem = localStorage.getItem("userPrivateKey");
      console.log("Private key imported successfully");

      setSuccess("All keys loaded successfully!");
    } catch (err: any) {
      console.error("Error loading keys:", err);
      setError(`Error loading keys: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateNewKeys = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      console.log("Generating new key pair...");
      const keyPair = await generateKeyPair();

      setNewPublicKey(keyPair.publicKey);
      setNewPrivateKey(keyPair.privateKey);

      console.log("New keys generated successfully");
      setSuccess("New keys generated successfully!");
    } catch (err: any) {
      console.error("Error generating keys:", err);
      setError(`Error generating keys: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testEncryption = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!userPublicKey) {
        setError("Public key not loaded");
        return;
      }

      console.log("Testing encryption with message:", testMessage);
      const encrypted = await encryptMessage(userPublicKey, testMessage);
      setEncryptedMessage(encrypted);
      console.log("Encryption successful:", encrypted);
      setSuccess("Encryption successful!");
    } catch (err: any) {
      console.error("Encryption error:", err);
      setError(`Encryption failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDecryption = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!userPrivateKey) {
        setError("Private key not loaded");
        return;
      }

      if (!encryptedMessage) {
        setError("No encrypted message to decrypt");
        return;
      }

      console.log("Testing decryption with encrypted message:", encryptedMessage);
      const decrypted = await decryptMessage(userPrivateKey, encryptedMessage);
      setDecryptedMessage(decrypted);
      console.log("Decryption successful:", decrypted);
      setSuccess("Decryption successful!");
    } catch (err: any) {
      console.error("Decryption error:", err);
      setError(`Decryption failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNewKeyEncryption = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!newPublicKey) {
        setError("New public key not generated");
        return;
      }

      console.log("Testing encryption with NEW public key:", testMessage);
      const encrypted = await encryptMessage(newPublicKey, testMessage);
      setEncryptedMessage(encrypted);
      console.log("Encryption with new key successful:", encrypted);
      setSuccess("Encryption with new key successful!");
    } catch (err: any) {
      console.error("New key encryption error:", err);
      setError(`New key encryption failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNewKeyDecryption = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (!newPrivateKey) {
        setError("New private key not generated");
        return;
      }

      if (!encryptedMessage) {
        setError("No encrypted message to decrypt");
        return;
      }

      console.log("Testing decryption with NEW private key:", encryptedMessage);
      const decrypted = await decryptMessage(newPrivateKey, encryptedMessage);
      setDecryptedMessage(decrypted);
      console.log("Decryption with new key successful:", decrypted);
      setSuccess("Decryption with new key successful!");
    } catch (err: any) {
      console.error("New key decryption error:", err);
      setError(`New key decryption failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Encryption/Decryption Test</h1>

        {/* Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="grid grid-cols-6 gap-4 text-sm">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${userPublicKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
              User Public: {userPublicKey ? 'Loaded' : 'Not Loaded'}
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${userPrivateKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
              User Private: {userPrivateKey ? 'Loaded' : 'Not Loaded'}
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${newPrivateKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
              New Private: {newPrivateKey ? 'Generated' : 'Not Generated'}
            </div>
          </div>
        </div>

        {/* Test Message Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Message</h2>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Enter test message..."
          />
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Existing Keys (from localStorage/backend)</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={loadUserKeys}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Loading...' : 'Load Keys'}
                </button>
                <button
                  onClick={testEncryption}
                  disabled={loading || !userPublicKey}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Encrypting...' : 'Test Encryption'}
                </button>
                <button
                  onClick={testDecryption}
                  disabled={loading || !userPrivateKey || !encryptedMessage}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Decrypting...' : 'Test Decryption'}
                </button>

              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">New Keys (freshly generated)</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={generateNewKeys}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Generating...' : 'Generate New Keys'}
                </button>
                <button
                  onClick={testNewKeyEncryption}
                  disabled={loading || !newPublicKey}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Encrypting...' : 'New Key Encryption'}
                </button>
                <button
                  onClick={testNewKeyDecryption}
                  disabled={loading || !newPrivateKey || !encryptedMessage}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Decrypting...' : 'New Key Decryption'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Encrypted Message */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Encrypted Message</h2>
            <textarea
              value={encryptedMessage}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
              rows={6}
              placeholder="Encrypted message will appear here..."
            />
          </div>

          {/* Decrypted Message */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Decrypted Message</h2>
            <textarea
              value={decryptedMessage}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
              rows={6}
              placeholder="Decrypted message will appear here..."
            />
          </div>
        </div>



        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mt-6">
            <strong>Success:</strong> {success}
          </div>
        )}
      </div>
    </div>
  );

};

export default TestPage;
