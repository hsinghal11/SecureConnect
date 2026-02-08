import { Card } from "./ui/card";
import type { Chat, ChatParticipant } from "@/types/chat";

type SideChatsProps = {
  chats: Chat[];
  selectedChatId?: number;
  onChatSelect: (chat: Chat) => void;
};

import { useState, useMemo } from "react";

const SideChats = ({ chats, selectedChatId, onChatSelect }: SideChatsProps) => {
  const [search, setSearch] = useState("");

  const getDisplayName = (chat: Chat) => {
    // For one-on-one chats, find the other participant
    const otherParticipant = chat.participants.find(
      (participant: ChatParticipant) => participant.userId !== getCurrentUserId()
    );
    return otherParticipant?.user.name || "Unknown User";
  };

  const getDisplayImage = (chat: Chat) => {
    // For one-on-one chats, show the other user's picture
    const otherParticipant = chat.participants.find(
      (participant: ChatParticipant) => participant.userId !== getCurrentUserId()
    );
    return otherParticipant?.user.pic || "";
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

  const formatLastMessage = (chat: Chat) => {
    if (!chat.messages || chat.messages.length === 0) {
      return "No messages yet";
    }

    const latestMessage = chat.messages[chat.messages.length - 1];

    // Try to extract content from the message
    let content: any = null;

    if ('content' in latestMessage) {
      content = latestMessage.content;
    }

    // Handle JSON object format (E2EE encrypted format)
    if (content && typeof content === 'object' && content !== null) {
      const currentUserId = getCurrentUserId();
      if (currentUserId && content[currentUserId.toString()]) {
        // For chat previews, we can't decrypt, so show a placeholder
        return "Encrypted message";
      }
      return "Encrypted message";
    }

    // If content is a string (legacy format), show it
    if (content && typeof content === 'string') {
      if (content.length > 30) {
        return content.substring(0, 30) + "...";
      }
      return content;
    }

    // If content is not available, show a placeholder
    return "Encrypted message";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Filter chats based on search input (case-insensitive)
  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    return chats.filter((chat) =>
      getDisplayName(chat).toLowerCase().includes(search.trim().toLowerCase())
    );
  }, [chats, search]);

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
        <p className="text-sm text-gray-500 mt-1">
          {chats.length} conversation{chats.length !== 1 ? "s" : ""}
        </p>
        <input
          type="text"
          className="mt-3 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No chats found</p>
            <p className="text-sm">Try a different search</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredChats.map((chat) => (
              <Card
                key={chat.id}
                id={chat.id.toString()}
                className={`cursor-pointer transition-all duration-200 hover:bg-gray-50 ${selectedChatId === chat.id ? "bg-blue-50 border-blue-200" : ""
                  }`}
                onClick={() => onChatSelect(chat)}
              >
                <div className="p-3 flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className="h-12 w-12 rounded-full bg-cover bg-center flex items-center justify-center text-white font-semibold"
                      style={{
                        backgroundImage: getDisplayImage(chat)
                          ? `url(${getDisplayImage(chat)})`
                          : "none",
                        backgroundColor: getDisplayImage(chat)
                          ? "transparent"
                          : "#6B7280",
                      }}
                    >
                      {!getDisplayImage(chat) &&
                        getDisplayName(chat).charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getDisplayName(chat)}
                      </h3>
                      {chat.messages && chat.messages.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {formatTime(chat.updatedAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {formatLastMessage(chat)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SideChats;
