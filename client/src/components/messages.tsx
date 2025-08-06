import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import axios from "axios";
import BASE_URL from "@/BackendUrl";
import type { User, Message, Chat, ChatParticipant, SafeUser } from "@/types/chat";
import {
  encryptMessage,
  signMessage,
  importKeyFromPem,
  decryptMessage,
} from '@/lib/cryptoUtils';

// Utility function for double encryption E2EE
const createDoubleEncryptedMessage = async (
  plaintextMessage: string,
  senderPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey,
  recipientPublicKey: CryptoKey,
  senderId: number,
  recipientId: number
): Promise<Record<string, string>> => {
  try {
    console.log("Starting double encryption process:", {
      plaintextLength: plaintextMessage.length,
      senderId,
      recipientId,
      hasSenderPrivateKey: !!senderPrivateKey,
      hasSenderPublicKey: !!senderPublicKey,
      hasRecipientPublicKey: !!recipientPublicKey
    });

    // Encrypt the message with recipient's public key
    console.log("Encrypting for recipient...");
    const encryptedForRecipient = await encryptMessage(recipientPublicKey, plaintextMessage);
    console.log("Recipient encryption successful, length:", encryptedForRecipient.length);
    
    // Encrypt the same message with sender's own public key
    console.log("Encrypting for sender...");
    const encryptedForSender = await encryptMessage(senderPublicKey, plaintextMessage);
    console.log("Sender encryption successful, length:", encryptedForSender.length);
    
    // Create the JSON object with both encrypted versions
    const result = {
      [senderId.toString()]: encryptedForSender,
      [recipientId.toString()]: encryptedForRecipient
    };
    
    console.log("Double encryption completed successfully:", {
      resultKeys: Object.keys(result),
      senderKey: senderId.toString(),
      recipientKey: recipientId.toString()
    });
    
    return result;
  } catch (error) {
    console.error("Error in double encryption:", error);
    throw error;
  }
};

// MessageItem component for handling individual messages
const MessageItem: React.FC<{
  message: Message | any; // Handle both Message and ChatMessage types
  senderUser?: User;
  isOwnMessage: boolean;
  decryptMessageContent: (encryptedContent: string) => Promise<string>;
}> = ({ message, senderUser, isOwnMessage, decryptMessageContent }) => {
  const [decryptedContent, setDecryptedContent] = React.useState<string>("");
  const [isDecrypting, setIsDecrypting] = React.useState(true);

  React.useEffect(() => {
    const decryptContent = async () => {
      try {
        // Get current user ID
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          setDecryptedContent("User ID not found");
          setIsDecrypting(false);
          return;
        }

        console.log("MessageItem: Processing message", {
          messageId: message.id,
          senderId: message.senderId,
          currentUserId,
          contentType: typeof message.content,
          contentKeys: message.content ? Object.keys(message.content) : null
        });

        // Check if content is a JSON object (encrypted format)
        if (typeof message.content === 'object' && message.content !== null) {
          // Find the encrypted content for the current user
          const encryptedContent = message.content[currentUserId.toString()];
          console.log("Found encrypted content for user:", {
            userId: currentUserId.toString(),
            hasContent: !!encryptedContent,
            contentLength: encryptedContent ? encryptedContent.length : 0
          });
          
          if (encryptedContent) {
            const decrypted = await decryptMessageContent(encryptedContent);
            console.log("Decryption result:", decrypted);
            setDecryptedContent(decrypted);
          } else {
            console.log("No encrypted content found for current user");
            setDecryptedContent("Message not encrypted for you");
          }
        } else {
          console.log("Invalid message content format:", message.content);
          setDecryptedContent("Invalid message format");
        }
      } catch (error) {
        console.error("Error processing message content:", error);
        setDecryptedContent("Message could not be decrypted");
      } finally {
        setIsDecrypting(false);
      }
    };

    decryptContent();
  }, [message.content, decryptMessageContent]);

  const getCurrentUserId = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user && typeof user.id === "number" ? user.id : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  };

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage
            ? "bg-blue-500 text-white"
            : "bg-white text-gray-900 border border-gray-200"
        }`}
      >
        <div className="flex items-center space-x-2 mb-1">
          <img
            src={senderUser?.pic || ""}
            alt={senderUser?.name || "Unknown"}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-xs font-medium">
            {senderUser?.name || "Unknown User"}
          </span>
        </div>
        <p className="text-sm">
          {isDecrypting ? "Decrypting..." : decryptedContent}
        </p>
        <p className="text-xs opacity-70 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

type MessagesProps = {
  selectedChat: Chat | null;
  socket: any;
};

const Messages: React.FC<MessagesProps> = ({ selectedChat, socket }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserSignPrivateKey, setCurrentUserSignPrivateKey] = useState<CryptoKey | null>(null);
  const [currentUserDecryptPrivateKey, setCurrentUserDecryptPrivateKey] = useState<CryptoKey | null>(null);
  const [currentUserEncryptPublicKey, setCurrentUserEncryptPublicKey] = useState<CryptoKey | null>(null);
  const [recipientEncryptPublicKey, setRecipientEncryptPublicKey] = useState<CryptoKey | null>(null);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    console.log("Function: useEffect - START");
    const privateKeyPem = localStorage.getItem("userPrivateKey");
    const signingPrivateKey = localStorage.getItem("userSigningPrivateKey");
    
    // Get public key from user object in localStorage
    const userStr = localStorage.getItem("user");
    let publicKeyPem = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        publicKeyPem = user.publicKey;
        console.log("Extracted public key from user object, length:", publicKeyPem?.length);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    
    if (privateKeyPem && signingPrivateKey && publicKeyPem) {
      console.log("Attempting to import current user's keys.");
      console.log("Key lengths:", {
        privateKey: privateKeyPem.length,
        signingKey: signingPrivateKey.length,
        publicKey: publicKeyPem.length
      });
      
      const importStart = new Date();
      
      // Import signing private key
      importKeyFromPem(signingPrivateKey, "private", ["sign"])
        .then(key => {
          setCurrentUserSignPrivateKey(key);
          console.log("Current user's signing private key loaded successfully.");
        })
        .catch(err => {
          console.error("Error importing current user's signing private key:", err);
          console.error("Signing key PEM:", signingPrivateKey.substring(0, 100) + "...");
        });
      
      // Import decryption private key
      importKeyFromPem(privateKeyPem, "private", ["decrypt"])
        .then(key => {
          setCurrentUserDecryptPrivateKey(key);
          console.log("Current user's decryption private key loaded successfully.");
        })
        .catch(err => {
          console.error("Error importing current user's decryption private key:", err);
          console.error("Private key PEM:", privateKeyPem.substring(0, 100) + "...");
        });

      // Import encryption public key (for self-encryption)
      importKeyFromPem(publicKeyPem, "public", ["encrypt"])
        .then(key => {
          setCurrentUserEncryptPublicKey(key);
          console.log("Current user's encryption public key loaded successfully.");
        })
        .catch(err => {
          console.error("Error importing current user's encryption public key:", err);
          console.error("Public key PEM:", publicKeyPem.substring(0, 100) + "...");
        });
      
      const importEnd = new Date();
      const importDuration = importEnd.getTime() - importStart.getTime();
      console.log(`Importing current user's keys took: ${importDuration} ms`);
    } else {
      console.warn("User keys not found in localStorage. Please ensure user has signed up and generated keys.");
      console.log("Available keys:", {
        privateKeyPem: !!privateKeyPem,
        signingPrivateKey: !!signingPrivateKey,
        publicKeyPem: !!publicKeyPem
      });
    }

    console.log("Function: useEffect - END");
  }, []);

  // Add a key validation test
  const testKeyValidation = async () => {
    try {
      console.log("=== KEY VALIDATION TEST ===");
      
      if (!currentUserDecryptPrivateKey || !currentUserEncryptPublicKey) {
        console.error("Keys not loaded yet");
        return;
      }

      // Test 1: Encrypt with public key
      const testMessage = "Test message for validation";
      console.log("Test 1: Encrypting message:", testMessage);
      const encrypted = await encryptMessage(currentUserEncryptPublicKey, testMessage);
      console.log("Encryption successful, length:", encrypted.length);

      // Test 2: Decrypt with private key
      console.log("Test 2: Decrypting message");
      const decrypted = await decryptMessage(currentUserDecryptPrivateKey, encrypted);
      console.log("Decryption successful:", decrypted);
      console.log("Original vs Decrypted match:", testMessage === decrypted);

      if (testMessage === decrypted) {
        console.log("✅ KEY VALIDATION PASSED - Keys are working correctly");
      } else {
        console.log("❌ KEY VALIDATION FAILED - Keys are not working correctly");
      }
    } catch (error) {
      console.error("❌ KEY VALIDATION ERROR:", error);
    }
  };

  // Run key validation when keys are loaded
  useEffect(() => {
    if (currentUserDecryptPrivateKey && currentUserEncryptPublicKey) {
      // Wait a bit for all keys to load, then test
      setTimeout(() => {
        testKeyValidation();
      }, 1000);
    }
  }, [currentUserDecryptPrivateKey, currentUserEncryptPublicKey]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debug messages state changes
  useEffect(() => {
    console.log("Messages state updated:", {
      count: messages.length,
      messages: messages
    });
  }, [messages]);

  // Fetch messages and load recipient's public key when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      loadRecipientPublicKey();
      
      // Join the chat room for real-time updates
      if (socket) {
        socket.emit("join_chat", selectedChat.id);
        console.log("Joined chat room:", selectedChat.id);
      }
    }
  }, [selectedChat, socket]);

  // Listen for new messages from socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage: any) => {
      console.log("Received new message via socket:", newMessage);
      
      // Only add message if it's for the current chat and not from current user
      if (newMessage.chatId === selectedChat?.id && newMessage.senderId !== getCurrentUserId()) {
        setMessages(prev => [...prev, newMessage]);
        console.log("Added new message to chat");
      }
    };

    socket.on("message received", handleNewMessage);

    return () => {
      socket.off("message received", handleNewMessage);
    };
  }, [socket, selectedChat, messages]);

  const loadRecipientPublicKey = async () => {
    if (!selectedChat) return;
    
    // Find the other participant (not the current user)
    const currentUserId = getCurrentUserId();
    const otherParticipant = selectedChat.participants.find(
      (participant: ChatParticipant) => participant.userId !== currentUserId
    );
    
    console.log("Selected chat participants:", selectedChat.participants);
    console.log("Current user ID:", currentUserId);
    console.log("Other participant:", otherParticipant);
    
    if (otherParticipant?.user.publicKey) {
      try {
        console.log("Loading recipient's public key for encryption...");
        const recipientKey = await importKeyFromPem(
          otherParticipant.user.publicKey,
          "public",
          ["encrypt"]
        );
        setRecipientEncryptPublicKey(recipientKey);
        console.log("Recipient's public key loaded successfully.");
      } catch (error) {
        console.error("Error loading recipient's public key:", error);
      }
    } else {
      console.warn("Recipient's public key not found in chat participants.");
      
      // Try to fetch the recipient's public key from the backend
      if (otherParticipant?.user.id) {
        try {
          console.log("Attempting to fetch recipient's public key from backend...");
          const userResponse = await axios.get(
            `${BASE_URL}/api/v1/user/public-key/${otherParticipant.user.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          console.log("Backend response for public key:", userResponse.data);
           
          // Try different possible response formats
          let publicKey = null;
          if (userResponse.data.success) {
            if (userResponse.data.data?.publicKey) {
              publicKey = userResponse.data.data.publicKey;
            } else if (userResponse.data.publicKey) {
              publicKey = userResponse.data.publicKey;
            } else if (userResponse.data.data) {
              publicKey = userResponse.data.data;
            }
          } else if (userResponse.data.publicKey) {
            publicKey = userResponse.data.publicKey;
          }
           
          if (publicKey) {
            console.log("Fetched recipient's public key from backend");
            const recipientKey = await importKeyFromPem(
              publicKey,
              "public",
              ["encrypt"]
            );
            setRecipientEncryptPublicKey(recipientKey);
            console.log("Recipient's public key loaded successfully from backend.");
          } else {
            console.error("Failed to fetch recipient's public key from backend");
          }
        } catch (error) {
          console.error("Error fetching recipient's public key from backend:", error);
        }
      }
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/message/${selectedChat.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      console.log("Chat response:", response.data);
      
      if (response.data.success) {
        // The response structure shows messages directly in data array
        const messagesArray = response.data.data || [];
        console.log("Messages array:", messagesArray);
        
        // Sort messages by createdAt in ascending order (oldest first)
        const sortedMessages = messagesArray.sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log("Sorted messages:", sortedMessages);
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user && typeof user.id === "number" ? user.id : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  };

  // Function to decrypt message content
  const decryptMessageContent = async (encryptedContent: string): Promise<string> => {
    if (!currentUserDecryptPrivateKey) {
      console.error("Decryption key not available");
      return "Message could not be decrypted";
    }
    
    try {
      console.log("Attempting to decrypt content:", {
        contentLength: encryptedContent.length,
        contentPreview: encryptedContent.substring(0, 50) + "..."
      });
      
      const decryptedContent = await decryptMessage(currentUserDecryptPrivateKey, encryptedContent);
      console.log("Decryption successful:", decryptedContent);
      return decryptedContent;
    } catch (error: any) {
      console.error("Error decrypting message:", error);
      console.error("Error details:", {
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      return "Message could not be decrypted";
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    console.log("handleSendMessage: Starting message send process");
    console.log("Keys status:", {
      signingKey: !!currentUserSignPrivateKey,
      encryptKey: !!currentUserEncryptPublicKey,
      decryptKey: !!currentUserDecryptPrivateKey,
      recipientKey: !!recipientEncryptPublicKey
    });

    if (!currentUserSignPrivateKey || !currentUserEncryptPublicKey) {
      alert("Keys are not loaded yet. Please wait or check console for errors.");
      console.log("handleSendMessage: Keys not loaded, returning.");
      return;
    }

    if (!recipientEncryptPublicKey) {
      alert("Recipient's public key not available. Cannot send encrypted message.");
      console.log("handleSendMessage: Recipient's public key not available, returning.");
      return;
    }

    try {
      // Get current user ID and recipient info
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        console.error("Current user ID not found");
        return;
      }

      const otherParticipant = selectedChat.participants.find(
        (participant: ChatParticipant) => participant.userId !== currentUserId
      );
      
      if (!otherParticipant) {
        console.error("Recipient not found in chat participants");
        return;
      }

      console.log("Performing double encryption for message:", {
        senderId: currentUserId,
        recipientId: otherParticipant.userId,
        messageLength: newMessage.length
      });

      // Perform double encryption
      const encryptedContent = await createDoubleEncryptedMessage(
        newMessage,
        currentUserDecryptPrivateKey!, // We need the private key for signing
        currentUserEncryptPublicKey,
        recipientEncryptPublicKey,
        currentUserId,
        otherParticipant.userId
      );

      console.log("Double encryption completed successfully");

      // Sign the original message
      const signature = await signMessage(currentUserSignPrivateKey, newMessage);
      console.log("Message signed successfully");

      const response = await axios.post(
        `${BASE_URL}/api/v1/message`,
        {
          content: encryptedContent,
          chatId: selectedChat.id,
          senderId: currentUserId,
          signature: signature,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        console.log("Message sent successfully:", response.data);
        // Add new message to the end of the list
        const newMsg = response.data.data;
        setMessages(prev => [...prev, newMsg]);
        setNewMessage("");
        
        // Emit socket event if socket is available
        if (socket) {
          socket.emit("new message", {
            content: encryptedContent, // Emit encrypted content, not plaintext
            chatId: selectedChat.id,
            senderId: newMsg.senderId,
            signature: signature,
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-gray-500">
            Choose a conversation from the sidebar to begin
          </p>
        </div>
      </div>
    );
  }

  // Get the other participant for display
  const currentUserId = getCurrentUserId();
  const otherParticipant = selectedChat.participants.find(
    (participant: ChatParticipant) => participant.userId !== currentUserId
  );

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <img  
            src={otherParticipant?.user.pic || ""}
            alt="Chat"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-medium text-gray-900">
              {otherParticipant?.user.name || "Unknown User"}
            </h3>
            <p className="text-sm text-gray-500">
              Direct Message
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              console.log("Rendering message:", message);
              
              // Find the sender user - try multiple approaches
              let senderUser = null;
              
              // First, try to get sender from the message's sender object
              if (message.sender) {
                senderUser = message.sender;
                console.log("Found sender from message.sender:", senderUser);
              } else {
                // Fallback: find sender from chat participants
                senderUser = selectedChat.participants.find(
                  (participant: ChatParticipant) => participant.userId === message.senderId
                )?.user;
                console.log("Found sender from participants:", senderUser);
              }
               
              const isOwnMessage = message.senderId === getCurrentUserId();
              
              console.log("Message details:", {
                messageId: message.id,
                senderId: message.senderId,
                senderUser,
                isOwnMessage,
                hasSenderObject: !!message.sender,
                participantsCount: selectedChat.participants.length
              });
               
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  senderUser={senderUser}
                  isOwnMessage={isOwnMessage}
                  decryptMessageContent={decryptMessageContent}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-6"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages; 