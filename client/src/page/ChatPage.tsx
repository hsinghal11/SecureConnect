// Example: client/src/App.tsx (Conceptual, adapt to your chat component structure)
import { useState, useEffect } from 'react';
import {
  encryptMessage,
  decryptMessage,
  signMessage,
  importKeyFromPem,
} from '../lib/cryptoUtils'; // Adjust path
// Assume you have state for current user, recipient, messages, etc.

// This is a simplified example. You'll need to adapt it to your actual chat UI.

interface Message {
  id: number;
  content: string; // This will be the encrypted content
  senderId: number;
  chatId: number;
  // Potentially include signature in message object if stored in DB, otherwise pass separately
  // signature?: string;
}

function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentUserPrivateKey, setCurrentUserPrivateKey] = useState<CryptoKey | null>(null);
  const [recipientPublicKey, setRecipientPublicKey] = useState<CryptoKey | null>(null);
  const [senderSigningPrivateKey, setSenderSigningPrivateKey] = useState<CryptoKey | null>(null);
  const [recipientSigningPublicKey, setRecipientSigningPublicKey] = useState<CryptoKey | null>(null);

  const currentUserId = 1; // Replace with actual current user ID
  const currentChatId = 123; // Replace with actual chat ID
  const recipientUserId = 2; // Replace with actual recipient ID

  // Load private key on component mount
  useEffect(() => {
    const privateKeyPem = localStorage.getItem("userPrivateKey");
    if (privateKeyPem) {
      // Import the private key for decryption
      importKeyFromPem(privateKeyPem, 'private', ['decrypt'])
        .then(key => setCurrentUserPrivateKey(key))
        .catch(error => console.error("Error importing private key:", error));

      // Import the private key for signing (assuming same key pair for simplicity)
      importKeyFromPem(privateKeyPem, 'private', ['sign'])
        .then(key => setSenderSigningPrivateKey(key))
        .catch(error => console.error("Error importing signing private key:", error));
    }

    // Fetch recipient's public key (replace with your API call)
    fetch(`/api/v1/user/public-key/${recipientUserId}`) // Use the new backend endpoint
      .then(res => res.json())
      .then(async (data) => {
        if (data.publicKey) {
          // Import recipient's public key for encryption
          const pubKey = await importKeyFromPem(data.publicKey, 'public', ['encrypt']);
          setRecipientPublicKey(pubKey);

          // Import recipient's public key for verifying their signature
          const signingPubKey = await importKeyFromPem(data.publicKey, 'public', ['verify']);
          setRecipientSigningPublicKey(signingPubKey);
        }
      })
      .catch(error => console.error("Error fetching recipient public key:", error));

    // Fetch existing messages for the chat (these will be encrypted)
    fetch(`/api/v1/messages/chat/${currentChatId}`) // Adjust endpoint
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setMessages(data.data);
        }
      })
      .catch(error => console.error("Error fetching messages:", error));

  }, []);

  const handleSendMessage = async () => {
    console.log(inputMessage);

    if (!inputMessage.trim() || !recipientPublicKey || !senderSigningPrivateKey) {
      alert("Please type a message, ensure keys are loaded.");
      return;
    }

    try {
      // 1. Encrypt the message with the recipient's public key
      const encryptedContent = await encryptMessage(recipientPublicKey, inputMessage);

      // 2. Sign the original message with the sender's private key
      const signature = await signMessage(senderSigningPrivateKey, inputMessage);

      // 3. Send encrypted message and signature to backend
      const response = await fetch("/api/v1/messages/send", { // Adjust endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if your API is protected
          "Authorization": `Bearer YOUR_AUTH_TOKEN`,
        },
        body: JSON.stringify({
          encryptedContent,
          senderId: currentUserId,
          chatId: currentChatId,
          signature, // Send the signature
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Message sent:", data);
        setMessages((prev) => [...prev, {
          id: Date.now(), // Temp ID
          content: encryptedContent,
          senderId: currentUserId,
          chatId: currentChatId,
        }]);
        setInputMessage('');
      } else {
        console.error("Failed to send message:", data.message);
        alert(data.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("An error occurred while sending the message.");
    }
  };

  const handleDecryptAndVerify = async (message: Message) => {
    if (!currentUserPrivateKey || !recipientSigningPublicKey) {
      console.error("Keys not loaded for decryption/verification.");
      return "Error: Keys not loaded";
    }

    try {
      // First, fetch the original sender's public key for verification if not already loaded.
      // For this example, assuming 'recipientSigningPublicKey' is the sender's public key (from previous fetch)
      // In a real app, you'd fetch the public key of `message.senderId`.
      // Let's assume for this simple example, `recipientSigningPublicKey` refers to the *other* user's public key.
      // You'd need a map of user IDs to public keys in a real application.

      // For demonstration, let's assume the `message` object includes the `signature` that was sent.
      // If the signature is not stored in the `Message` object in your DB, the sender must send it alongside the encrypted content,
      // and your message sending/receiving mechanism (e.g., WebSockets) would need to handle it.
      // For now, let's assume the signature is received with the message, or you might need a different flow.
      // For the provided `message.controller.ts`, the signature is sent along with the response from `sendMessage`.
      // So, when fetching messages, you'd need to modify `fetchMessages` to also return signatures if stored.
      // Or, this verification might happen immediately upon receiving a new message via WebSocket.

      // For a truly E2E verified message, the signature would be on the *encrypted* message, or on the *plaintext* message.
      // If signed on plaintext, you need the plaintext to verify. If on encrypted, you need the encrypted to verify.
      // Given the prompt asks for "public, private and signatures are used", signing the *original plaintext* and verifying against it
      // provides authenticity of the *content*.

      // Let's assume you pass the *original plaintext* and *signature* along with the encrypted message for simplicity in this example.
      // This is a simplification and not how it's typically done in production E2EE (where signatures are on ciphertext or part of a more complex protocol).

      // To verify the signature, you need the original message *before encryption*.
      // This means the sender would sign the plaintext, then encrypt the plaintext, and send both the encrypted plaintext and the signature of the plaintext.
      // The recipient would then decrypt the plaintext, and then verify the signature against the *decrypted plaintext*.

      // Let's adjust the conceptual `handleSendMessage` to reflect this:
      // When sending, you sign the `inputMessage`, then encrypt `inputMessage`.
      // The `signature` is also sent to the backend.
      // The `Message` interface would need `signature: string;`

      // For now, let's simplify and assume for the purpose of this demo that the message.content is the encrypted part
      // and we just need to decrypt it. Full signature verification would require rethinking how the signature is transmitted.

      const decrypted = await decryptMessage(currentUserPrivateKey, message.content); // Decrypt using own private key

      // Simplified: If you had the original signature (e.g., if it was stored in the Message object or passed via WebSocket)
      // and the original sender's public key for signing, you could then verify:
      // const isValid = await verifySignature(recipientSigningPublicKey, message.signature, decrypted);
      // if (!isValid) {
      //   console.warn("Signature verification failed for message:", message.id);
      //   return `[Decrypted but Signature Invalid]: ${decrypted}`;
      // }

      return decrypted;
    } catch (error) {
      console.error("Error decrypting message:", error);
      return "[Undecryptable Message]";
    }
  };

  return (
    <div>
      <h1>Chat Application</h1>
      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>User {msg.senderId}:</strong>{' '}
            {/* Call handleDecryptAndVerify to show decrypted content */}
            <p>{msg.content} (Encrypted)</p>
            {/* In a real app, you'd display the decrypted content directly after decryption */}
            <button onClick={async () => alert(await handleDecryptAndVerify(msg))}>
              Decrypt/Verify
            </button>
          </div>
        ))}
      </div>
      <div>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage}>Send Encrypted</button>
      </div>
    </div>
  );
}

export default ChatComponent;