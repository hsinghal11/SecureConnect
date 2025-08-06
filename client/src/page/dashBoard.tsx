import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Search from "@/components/search";
import Messages from "@/components/messages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BASE_URL from "@/BackendUrl";
import { Socket } from "socket.io-client";
import SideChats from "@/components/sideChats";
import SideSlidingBar from "@/components/sideSlidingBar";
import type { User, Chat, Message } from "@/types/chat";

type DashboardProps = {
  socket: Socket;
};

const Dashboard = ({ socket }: DashboardProps) => {
  // dashBoard.tsx:67 Uncaught TypeError: filteredChats.map is not a function
  //   at Dashboard (dashBoard.tsx:67:45)

  const [loading, setLoading] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [newUserResults, setNewUserResults] = useState<User[]>([]);

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    setLoading(true);
    const fetchChats = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/v1/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Error fetching chats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const handleSearchResults = useCallback((users: User[]) => {
    setNewUserResults(users);
  }, []);

  const handleLocalFilter = useCallback((filtered: Chat[]) => {
    setFilteredChats(filtered);
  }, []);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Start the chat, navigate to chat room, etc.
  };

  return (
    <div className="h-screen flex">
      {loading && <div>Loading...</div>}
       
      {/* Top bar with search button */}
      <div className="absolute top-0 left-0 z-10 p-2">
        <button
          className="text-lg font-bold px-3 py-1 rounded hover:bg-gray-200 bg-white shadow"
          onClick={() => setIsSearchOpen(true)}
        >
          Search
        </button>
      </div>

      {/* Sliding Search Drawer */}
      <SideSlidingBar open={isSearchOpen} onClose={() => setIsSearchOpen(false)}>
        <Search chats={chats} setChats={setChats} />
      </SideSlidingBar> 

      {/* Left Sidebar with Chats */}
      <div className="w-80 bg-white border-r border-gray-200">
        <SideChats 
          chats={chats} 
          selectedChatId={selectedChat?.id}
          onChatSelect={handleChatSelect}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Messages 
          selectedChat={selectedChat}
          socket={socket}
        />
      </div>
    </div>
  );
};
export default Dashboard;
