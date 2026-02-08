import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import BASE_URL from "@/BackendUrl";
import type { Chat, ChatParticipant, Message, User } from "@/types/chat";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  createEncryptedMessageEnvelope,
  decryptMessage,
  getEncryptedContentForUser,
  importKeyFromPem,
  signMessage,
} from "@/lib/cryptoUtils";

const getCurrentUserId = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return typeof user?.id === "number" ? user.id : null;
  } catch {
    return null;
  }
};

const MessageItem: React.FC<{
  message: Message;
  senderUser?: User;
  isOwnMessage: boolean;
  decryptMessageContent: (payload: unknown) => Promise<string>;
}> = ({ message, senderUser, isOwnMessage, decryptMessageContent }) => {
  const [decryptedContent, setDecryptedContent] = useState<string>("");

  useEffect(() => {
    let active = true;

    (async () => {
      const result = await decryptMessageContent(message.content);
      if (active) {
        setDecryptedContent(result);
      }
    })();

    return () => {
      active = false;
    };
  }, [message.content, decryptMessageContent]);

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
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
        <p className="text-sm">{decryptedContent || "Decrypting..."}</p>
        <p className="text-xs opacity-70 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

type MessagesProps = {
  selectedChat: Chat | null;
  socket: {
    emit: (event: string, payload: unknown) => void;
    on: (event: string, listener: (payload: Message) => void) => void;
    off: (event: string, listener: (payload: Message) => void) => void;
  } | null;
};

const Messages: React.FC<MessagesProps> = ({ selectedChat, socket }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserSigningPrivateKey, setCurrentUserSigningPrivateKey] =
    useState<CryptoKey | null>(null);
  const [currentUserDecryptPrivateKey, setCurrentUserDecryptPrivateKey] =
    useState<CryptoKey | null>(null);
  const [currentUserEncryptPublicKey, setCurrentUserEncryptPublicKey] =
    useState<CryptoKey | null>(null);
  const [recipientEncryptPublicKey, setRecipientEncryptPublicKey] =
    useState<CryptoKey | null>(null);

  const token = localStorage.getItem("authToken");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/message/${selectedChat.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setMessages(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      setLoading(false);
    }
  }, [selectedChat, token]);

  const loadRecipientPublicKey = useCallback(async () => {
    if (!selectedChat) return;

    const currentUserId = getCurrentUserId();
    const otherParticipant = selectedChat.participants.find(
      (participant: ChatParticipant) => participant.userId !== currentUserId
    );

    if (!otherParticipant) return;

    let publicKeyPem = otherParticipant.user.publicKey;

    if (!publicKeyPem) {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/v1/user/public-key/${otherParticipant.user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        publicKeyPem =
          response.data?.data?.publicKey ||
          response.data?.publicKey ||
          response.data?.data ||
          null;
      } catch (error) {
        console.error("Failed to fetch recipient public key", error);
      }
    }

    if (!publicKeyPem) {
      setRecipientEncryptPublicKey(null);
      return;
    }

    try {
      const key = await importKeyFromPem(publicKeyPem, "public", ["encrypt"]);
      setRecipientEncryptPublicKey(key);
    } catch (error) {
      console.error("Failed to import recipient public key", error);
      setRecipientEncryptPublicKey(null);
    }
  }, [selectedChat, token]);
  
  useEffect(() => {
    const loadCurrentUserKeys = async () => {
      const privateKeyPem = localStorage.getItem("userPrivateKey");
      const signingPrivateKeyPem = localStorage.getItem("userSigningPrivateKey");
      const userStr = localStorage.getItem("user");

      if (!privateKeyPem || !signingPrivateKeyPem || !userStr) {
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (!user?.publicKey) {
          return;
        }

        const [decryptKey, signingKey, encryptKey] = await Promise.all([
          importKeyFromPem(privateKeyPem, "private", ["decrypt"]),
          importKeyFromPem(signingPrivateKeyPem, "private", ["sign"]),
          importKeyFromPem(user.publicKey, "public", ["encrypt"]),
        ]);

        setCurrentUserDecryptPrivateKey(decryptKey);
        setCurrentUserSigningPrivateKey(signingKey);
        setCurrentUserEncryptPublicKey(encryptKey);
      } catch (error) {
        console.error("Failed to import current user keys", error);
      }
    };

    loadCurrentUserKeys();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      setRecipientEncryptPublicKey(null);
      return;
    }

    fetchMessages();
    loadRecipientPublicKey();

    if (socket) {
      socket.emit("join_chat", selectedChat.id);
    }
  }, [selectedChat, socket, fetchMessages, loadRecipientPublicKey]);

  useEffect(() => {
    if (!socket || !selectedChat) return;

    const onMessageReceived = (incoming: Message) => {
      if (incoming.chatId !== selectedChat.id) return;
      setMessages((prev) => [...prev, incoming]);
    };

    socket.on("message received", onMessageReceived);

    return () => {
      socket.off("message received", onMessageReceived);
    };
  }, [socket, selectedChat]);


  const decryptMessageContent = async (payload: unknown): Promise<string> => {
    if (!currentUserDecryptPrivateKey) {
      return "Missing private key";
    }

    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      return "Unable to determine current user";
    }

    const encryptedContent = getEncryptedContentForUser(payload, currentUserId);
    if (!encryptedContent) {
      return "Message unavailable for this user";
    }

    try {
      return await decryptMessage(currentUserDecryptPrivateKey, encryptedContent);
    } catch {
      return "Message could not be decrypted";
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;

    const otherParticipant = selectedChat.participants.find(
      (participant: ChatParticipant) => participant.userId !== currentUserId
    );

    if (
      !otherParticipant ||
      !currentUserSigningPrivateKey ||
      !currentUserEncryptPublicKey ||
      !recipientEncryptPublicKey
    ) {
      alert("Encryption keys are not ready yet.");
      return;
    }

    setSending(true);

    try {
      const encryptedContent = await createEncryptedMessageEnvelope(newMessage, [
        { userId: currentUserId, publicKey: currentUserEncryptPublicKey },
        { userId: otherParticipant.userId, publicKey: recipientEncryptPublicKey },
      ]);

      const signature = await signMessage(currentUserSigningPrivateKey, newMessage);

      const response = await axios.post(
        `${BASE_URL}/api/v1/message`,
        {
          content: encryptedContent,
          chatId: selectedChat.id,
          senderId: currentUserId,
          signature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const createdMessage = response.data.data as Message;
        setMessages((prev) => [...prev, createdMessage]);
        setNewMessage("");

        if (socket) {
          socket.emit("new message", createdMessage);
        }
      }
    } catch (error) {
      console.error("Failed to send message", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
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
          <p className="text-gray-500">Choose a conversation from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  const currentUserId = getCurrentUserId();
  const otherParticipant = selectedChat.participants.find(
    (participant: ChatParticipant) => participant.userId !== currentUserId
  );

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <img
            src={otherParticipant?.user.pic || ""}
            alt="Chat"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-medium text-gray-900">{otherParticipant?.user.name || "Unknown User"}</h3>
            <p className="text-sm text-gray-500">Direct Message</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: Message & { sender?: User }) => {
              const senderUser =
                message.sender ||
                selectedChat.participants.find(
                  (participant: ChatParticipant) => participant.userId === message.senderId
                )?.user;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  senderUser={senderUser}
                  isOwnMessage={message.senderId === currentUserId}
                  decryptMessageContent={decryptMessageContent}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} className="px-6">
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
