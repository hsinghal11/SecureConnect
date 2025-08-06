/**
 * Represents the publicly safe information for a user.
 */
export type SafeUser = {
  id: number;
  name: string;
  email: string;
  pic?: string | null;
  publicKey?: string | null;
};

// Alias for backward compatibility
export type User = SafeUser;

/**
 * Represents a single message with its encrypted content object.
 */
export type ChatMessage = {
  id: number;
  // The 'content' is a JSON object where keys are user IDs
  // and values are the encrypted strings for that user.
  content: Record<string, string>;
  senderId: number;
  chatId: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // The API includes a simplified sender object with each message.
  sender: {
    id: number;
    name: string;
    pic?: string | null;
  };
};

/**
 * Represents a single message with its encrypted content object.
 * This is the type used for sending messages to the API.
 */
export type Message = {
  id: number;
  // The 'content' is a JSON object where keys are user IDs
  // and values are the encrypted strings for that user.
  content: Record<string, string>;
  senderId: number;
  chatId: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  signature?: string; // Digital signature
};

/**
 * Represents a user's participation in a chat.
 */
export type ChatParticipant = {
  userId: number;
  chatId: number;
  user: SafeUser; // Includes the full SafeUser object.
};

// Alias for backward compatibility
export type Participant = ChatParticipant;

/**
 * Base chat type with common properties
 */
export type BaseChat = {
  id: number;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
};

/**
 * Represents a chat as it appears in a user's chat list.
 */
export type ChatPreview = BaseChat & {
  // This array will contain the single latest message, if any.
  messages: ChatMessage[];
};

/**
 * Represents a fully loaded chat when a user opens it.
 * Includes all participants and messages.
 */
export type FullChat = BaseChat & {
  // This array will contain all messages for the chat
  messages: ChatMessage[];
};

// Alias for backward compatibility - Chat can be either ChatPreview or FullChat
export type Chat = ChatPreview | FullChat;
