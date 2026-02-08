import BASE_URL from "@/BackendUrl";
import axios from "axios";
import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "@radix-ui/react-label";
import { Button } from "./ui/button";
import type { SafeUser, Chat } from "@/types/chat";

type SearchProps = {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
};

const Search = ({ chats, setChats }: SearchProps) => {
  const [searchInput, setSearchInput] = useState("");
  const [foundUsers, setFoundUsers] = useState<SafeUser[]>([]);
  const [searching, setSearching] = useState(false);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : "";

  const handleSearch = async () => {
    if (searchInput.trim()) {
      setSearching(true);
      try {
        const res = await axios.get(
          `${BASE_URL}/api/v1/user/fuzzy-search?email=${searchInput}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const users = res.data.users || [];
        setFoundUsers(users);
      } catch (err) {
        console.error("Fuzzy search error", err);
        setFoundUsers([]);
      } finally {
        setSearching(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // When user clicks a found user, create a private chat
  const handleUserClick = async (user: SafeUser) => {
    try {
      const res = await axios.post(`${BASE_URL}/api/v1/chat/private`, {
        otherUserId: user.id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Chat created:", res.data);

      if (res.data.success) {
        // Add the new chat to the list if it doesn't already exist
        const newChat = res.data.data;
        const chatExists = chats.some(chat => chat.id === newChat.id);

        if (!chatExists) {
          setChats([...chats, newChat]);
        }
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="grid gap-2 p-4">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          type="text"
          placeholder="Search for users by email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button onClick={handleSearch} disabled={searching}>
          {searching ? "Searching..." : "Search Users"}
        </Button>
        {foundUsers.length > 0 && (
          <div className="mt-2 border rounded bg-white shadow p-2">
            <div className="font-semibold text-sm mb-1">Found Users:</div>
            <ul className="divide-y">
              {foundUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-100 rounded transition"
                  onClick={() => handleUserClick(user)}
                >
                  <img
                    src={user.pic || ""}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border"
                  />
                  <div>
                    <div className="font-medium text-gray-800">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
