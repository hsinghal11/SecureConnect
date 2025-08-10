# SecureConnect - End-to-End Encrypted Chat Application

## 📋 Project Overview

SocketPrep is a real-time, end-to-end encrypted (E2EE) chat application built with React, TypeScript, Node.js, and Socket.IO. The application implements advanced cryptographic techniques to ensure message privacy and security while providing real-time communication capabilities.

## 🎯 Key Features

- **End-to-End Encryption (E2EE)**: Messages are encrypted on the client-side using RSA-OAEP
- **Double Encryption Scheme**: Messages are encrypted for both sender and recipient
- **Digital Signatures**: Message authenticity verification using RSASSA-PKCS1-v1_5
- **Real-time Communication**: WebSocket-based instant messaging
- **One-on-One Chats**: Private conversations between two users
- **User Authentication**: JWT-based authentication system
- **Profile Management**: User profiles with avatars
- **Modern UI**: Clean, responsive interface built with Tailwind CSS

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time communication
- **Axios** for HTTP requests
- **Web Crypto API** for cryptographic operations

### Backend Stack
- **Node.js** with TypeScript
- **Express.js** for REST API
- **Socket.IO** for WebSocket server
- **Prisma** as ORM
- **PostgreSQL** for database
- **JWT** for authentication
- **Multer** for file uploads
- **Cloudinary** for image storage

## 🔐 Cryptographic Implementation

### Key Generation
The application generates two key pairs per user:
1. **Encryption Key Pair**: RSA-OAEP for message encryption/decryption
2. **Signing Key Pair**: RSASSA-PKCS1-v1_5 for digital signatures

```typescript
// Key generation using Web Crypto API
const generateKeyPair = async () => {
  const encryptionKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const signingKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  return {
    publicKey: encryptionKeyPair.publicKey,
    privateKey: encryptionKeyPair.privateKey,
    signingPublicKey: signingKeyPair.publicKey,
    signingPrivateKey: signingKeyPair.privateKey,
  };
};
```

### Double Encryption Scheme
Messages are encrypted twice to ensure both sender and recipient can read them:

```typescript
const createDoubleEncryptedMessage = async (
  plaintextMessage: string,
  senderPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey,
  recipientPublicKey: CryptoKey,
  senderId: number,
  recipientId: number
): Promise<Record<string, string>> => {
  // Encrypt for recipient
  const encryptedForRecipient = await encryptMessage(recipientPublicKey, plaintextMessage);
  
  // Encrypt for sender (self-encryption)
  const encryptedForSender = await encryptMessage(senderPublicKey, plaintextMessage);
  
  // Return JSON object with user IDs as keys
  return {
    [senderId.toString()]: encryptedForSender,
    [recipientId.toString()]: encryptedForRecipient
  };
};
```

### Message Content Structure
Messages are stored as JSON objects where keys are user IDs and values are encrypted strings:

```typescript
// Example message content
{
  "1": "encrypted_string_for_user_1",
  "2": "encrypted_string_for_user_2"
}
```

## 🚀 Development Journey

### Phase 1: Initial Setup and Architecture

#### Problem 1: Backend Architecture Refactoring
**Issue**: The backend needed to be completely refactored to support only one-on-one end-to-end encrypted chats, removing all group chat functionality.

**Solution**: 
- Updated database schema to focus on private chats
- Modified API routes to handle only one-on-one conversations
- Implemented new message structure with encrypted content

**Files Modified**:
- `server/src/controllers/chat.controller.ts`
- `server/src/controllers/message.controller.ts`
- `server/prisma/schema.prisma`

#### Problem 2: Frontend Component Refactoring
**Issue**: Frontend components needed to be updated to match the new backend architecture and support the new message format.

**Solution**:
- Refactored `messages.tsx` to handle encrypted message content
- Updated `search.tsx` to create private chats only
- Modified `sideChats.tsx` to display one-on-one conversations
- Updated TypeScript types in `chat.ts`

**Key Changes**:
```typescript
// Updated Message type
export type Message = {
  id: number;
  senderId: number;
  chatId: number;
  content: Record<string, string>; // JSON object with encrypted content
  createdAt: string;
  updatedAt: string;
  sender?: User;
};
```

### Phase 2: Cryptographic Implementation

#### Problem 3: Key Generation and Storage
**Issue**: Users needed to generate cryptographic keys during signup and store them securely.

**Solution**:
- Implemented key generation during user registration
- Created secure key storage in localStorage
- Added key validation and confirmation UI

**Implementation**:
```typescript
// Signup process with key generation
const handleSignUp = async (e: React.FormEvent) => {
  // Generate key pairs
  const keys = await generateKeyPair();
  
  // Export keys to PEM format
  const privateKeyPem = await exportKeyToPem(keys.privateKey, "private");
  const signingPrivateKeyPem = await exportKeyToPem(keys.signingPrivateKey, "private");
  const publicKeyPem = await exportKeyToPem(keys.publicKey, "public");
  
  // Store private keys locally
  localStorage.setItem("userPrivateKey", privateKeyPem);
  localStorage.setItem("userSigningPrivateKey", signingPrivateKeyPem);
  
  // Send public key to server
  // ... registration logic
};
```

#### Problem 4: Message Encryption and Decryption
**Issue**: Implementing the double encryption scheme where messages are encrypted for both sender and recipient.

**Solution**:
- Created `createDoubleEncryptedMessage` utility function
- Implemented message encryption using recipient's public key
- Added self-encryption using sender's public key
- Created message decryption logic for reading messages

**Implementation**:
```typescript
// Message sending with double encryption
const handleSendMessage = async () => {
  // Perform double encryption
  const encryptedContent = await createDoubleEncryptedMessage(
    newMessage,
    currentUserDecryptPrivateKey,
    currentUserEncryptPublicKey,
    recipientEncryptPublicKey,
    currentUserId,
    recipientId
  );
  
  // Sign the message
  const signature = await signMessage(currentUserSignPrivateKey, newMessage);
  
  // Send to server
  const response = await axios.post(`${BASE_URL}/api/v1/message`, {
    content: encryptedContent,
    chatId: selectedChat.id,
    senderId: currentUserId,
    signature: signature,
  });
};
```

### Phase 3: Real-time Communication

#### Problem 5: Socket.IO Implementation
**Issue**: Implementing real-time message delivery while maintaining encryption security.

**Solution**:
- Set up Socket.IO server for real-time communication
- Implemented chat room joining/leaving
- Created message broadcasting system
- Ensured encrypted content is transmitted via sockets

**Backend Implementation**:
```typescript
// Socket.IO server setup
io.on("connection", (socket: Socket) => {
  // Join chat room
  socket.on("join_chat", (chatId) => {
    socket.join(`chat_${chatId}`);
  });
  
  // Handle new messages
  socket.on("new message", (newMessageReceived) => {
    // Broadcast to chat room
    socket.to(`chat_${newMessageReceived.chatId}`).emit("message received", newMessageReceived);
  });
});
```

**Frontend Implementation**:
```typescript
// Socket event handling
useEffect(() => {
  if (selectedChat) {
    // Join chat room
    socket.emit("join_chat", selectedChat.id);
  }
}, [selectedChat, socket]);

// Listen for new messages
useEffect(() => {
  const handleNewMessage = (newMessage: any) => {
    if (newMessage.chatId === selectedChat?.id && newMessage.senderId !== getCurrentUserId()) {
      setMessages(prev => [...prev, newMessage]);
    }
  };
  
  socket.on("message received", handleNewMessage);
  return () => socket.off("message received", handleNewMessage);
}, [socket, selectedChat]);
```

### Phase 4: Critical Bug Fixes

#### Problem 6: Key Mismatch Issue (Major Bug)
**Issue**: Users were experiencing "OperationError" during message decryption, indicating that public and private keys didn't match.

**Root Cause**: The signup process was generating two separate key pairs instead of using one key pair for all operations.

**Original Buggy Code**:
```typescript
// WRONG - Two different key pairs!
const keys1 = await generateKeyPair(); // First key pair
const keys2 = await generateKeyPair(); // Second key pair (different!)
```

**Solution**: Modified signup to use a single key pair for all keys.

**Fixed Code**:
```typescript
// CORRECT - One key pair for all keys!
const keys = await generateKeyPair(); // Single key pair
const privateKey = await exportKeyToPem(keys.privateKey, "private");
const signingKey = await exportKeyToPem(keys.signingPrivateKey, "private");
const publicKey = await exportKeyToPem(keys.publicKey, "public"); // Same key pair!
```

**Files Modified**:
- `client/src/page/signup.tsx`

#### Problem 7: Socket Security Issue
**Issue**: Socket.IO was transmitting plaintext messages instead of encrypted content, compromising security.

**Solution**: Updated socket emission to send encrypted content only.

**Before**:
```typescript
socket.emit("new message", {
  content: newMessage, // Plaintext - SECURITY ISSUE!
  chatId: selectedChat.id,
  senderId: newMsg.senderId,
});
```

**After**:
```typescript
socket.emit("new message", {
  content: encryptedContent, // Encrypted content - SECURE!
  chatId: selectedChat.id,
  senderId: newMsg.senderId,
  signature: signature,
});
```

#### Problem 8: Message Display Issues
**Issue**: Messages were not displaying correctly due to incorrect data access patterns and sender information retrieval.

**Solutions**:
1. **Fixed Data Access**: Corrected API response parsing
2. **Improved Sender Lookup**: Enhanced sender information retrieval
3. **Added Debugging**: Implemented comprehensive logging for troubleshooting

**Implementation**:
```typescript
// Fixed message fetching
const fetchMessages = async () => {
  const response = await axios.get(`${BASE_URL}/api/v1/message/${selectedChat.id}`);
  
  if (response.data.success) {
    const messagesArray = response.data.data || []; // Correct data access
    const sortedMessages = messagesArray.sort((a: any, b: any) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    setMessages(sortedMessages);
  }
};

// Improved sender lookup
const getSenderUser = (message: any) => {
  // First, try message.sender from API
  if (message.sender) {
    return message.sender;
  }
  
  // Fallback to chat participants
  return selectedChat.participants.find(
    (participant: ChatParticipant) => participant.userId === message.senderId
  )?.user;
};
```

### Phase 5: Testing and Validation

#### Problem 9: Debugging Cryptographic Operations
**Issue**: Need to verify that encryption/decryption was working correctly and identify issues.

**Solution**: Created comprehensive testing and debugging system.

**Key Validation Test**:
```typescript
const testKeyValidation = async () => {
  try {
    console.log("=== KEY VALIDATION TEST ===");
    
    // Test encryption
    const testMessage = "Test message for validation";
    const encrypted = await encryptMessage(currentUserEncryptPublicKey, testMessage);
    console.log("Encryption successful, length:", encrypted.length);
    
    // Test decryption
    const decrypted = await decryptMessage(currentUserDecryptPrivateKey, encrypted);
    console.log("Decryption successful:", decrypted);
    
    if (testMessage === decrypted) {
      console.log("✅ KEY VALIDATION PASSED");
    } else {
      console.log("❌ KEY VALIDATION FAILED");
    }
  } catch (error) {
    console.error("❌ KEY VALIDATION ERROR:", error);
  }
};
```

**Test Page Creation**:
Created `client/src/page/test.tsx` for isolated cryptographic testing:
- Test encryption/decryption with existing keys
- Test with newly generated keys
- Comprehensive error logging
- Key validation utilities

## 🔧 Technical Challenges and Solutions

### Challenge 1: Web Crypto API Integration
**Problem**: Integrating Web Crypto API with React and TypeScript while maintaining type safety.

**Solution**:
- Created comprehensive type definitions
- Implemented error handling for crypto operations
- Added fallback mechanisms for unsupported browsers

### Challenge 2: Key Management
**Problem**: Securely storing and managing cryptographic keys across browser sessions.

**Solution**:
- Implemented secure localStorage storage
- Added key validation on application startup
- Created key recovery mechanisms

### Challenge 3: Real-time Message Synchronization
**Problem**: Ensuring messages appear in real-time while maintaining encryption.

**Solution**:
- Implemented Socket.IO with encrypted content transmission
- Added message deduplication logic
- Created proper chat room management

### Challenge 4: Error Handling and Debugging
**Problem**: Debugging cryptographic operations and identifying failure points.

**Solution**:
- Implemented comprehensive logging system
- Created isolated testing environment
- Added detailed error reporting

## 📁 Project Structure

```
SocketPrep/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── messages.tsx         # Message handling and display
│   │   │   ├── search.tsx           # User search functionality
│   │   │   ├── sideChats.tsx        # Chat list component
│   │   │   └── ui/                  # UI components
│   │   ├── lib/
│   │   │   └── cryptoUtils.ts       # Cryptographic utilities
│   │   ├── page/
│   │   │   ├── Login.tsx            # Login page
│   │   │   ├── signup.tsx           # Signup page with key generation
│   │   │   ├── test.tsx             # Cryptographic testing page
│   │   │   └── dashBoard.tsx        # Main dashboard
│   │   ├── types/
│   │   │   └── chat.ts              # TypeScript type definitions
│   │   └── App.tsx                  # Main application component
│   └── package.json
├── server/                          # Backend Node.js application
│   ├── src/
│   │   ├── controllers/             # API controllers
│   │   │   ├── chat.controller.ts   # Chat management
│   │   │   ├── message.controller.ts # Message handling
│   │   │   └── user.controller.ts   # User management
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Express middleware
│   │   ├── utils/                   # Utility functions
│   │   └── index.ts                 # Main server file with Socket.IO
│   ├── prisma/
│   │   └── schema.prisma            # Database schema
│   └── package.json
└── README.md                        # This documentation
```

## 🔐 Security Features

### 1. End-to-End Encryption
- Messages encrypted on client-side before transmission
- Server cannot read message content
- Uses industry-standard RSA-OAEP algorithm

### 2. Double Encryption Scheme
- Messages encrypted for both sender and recipient
- Ensures sender can read their own messages
- Prevents message loss due to key issues

### 3. Digital Signatures
- Message authenticity verification
- Prevents message tampering
- Uses RSASSA-PKCS1-v1_5 algorithm

### 4. Secure Key Management
- Private keys stored locally only
- Public keys shared via secure API
- Key validation on application startup

### 5. Real-time Security
- Encrypted content transmitted via WebSocket
- No plaintext transmission
- Secure chat room management

## 🚀 Deployment Considerations

### Frontend Deployment (Vercel)
- ✅ **Supported**: React applications work perfectly
- ❌ **Not Supported**: Socket.IO client connections (but can connect to external backend)

### Backend Deployment (Railway Recommended)
- ✅ **Full Support**: Socket.IO, persistent connections
- ✅ **Database**: PostgreSQL support
- ✅ **Environment Variables**: Easy management
- ✅ **Auto-deployment**: GitHub integration

### Alternative Hosting Options
1. **Render**: Good for WebSocket applications
2. **Heroku**: Classic choice, reliable
3. **DigitalOcean**: Full control, good performance
4. **AWS/GCP/Azure**: Enterprise-grade, more complex

## 🧪 Testing Strategy

### 1. Cryptographic Testing
- Key generation validation
- Encryption/decryption testing
- Digital signature verification
- Cross-browser compatibility

### 2. Real-time Testing
- Socket connection testing
- Message delivery verification
- Chat room management testing
- Connection recovery testing

### 3. Security Testing
- Key validation testing
- Message integrity verification
- Authentication testing
- Authorization testing

## 📊 Performance Considerations

### 1. Cryptographic Operations
- RSA operations are CPU-intensive
- Implemented async operations to prevent UI blocking
- Added loading states for better UX

### 2. Real-time Communication
- Socket.IO connection management
- Message queuing for offline scenarios
- Efficient chat room management

### 3. Database Optimization
- Proper indexing on chat and message tables
- Efficient query patterns
- Transaction management for data integrity

## 🔮 Future Enhancements

### 1. Advanced Security Features
- Perfect Forward Secrecy (PFS)
- Message expiration
- Self-destructing messages
- Offline message encryption

### 2. User Experience Improvements
- Message status indicators
- Typing indicators
- File sharing with encryption
- Voice/video calling

### 3. Scalability Features
- Message pagination
- Chat archiving
- Multi-device synchronization
- Push notifications

## 🐛 Common Issues and Solutions

### Issue 1: "OperationError" During Decryption
**Cause**: Key mismatch between public and private keys
**Solution**: Ensure single key pair generation during signup

### Issue 2: Messages Not Appearing in Real-time
**Cause**: Socket connection issues or incorrect event handling
**Solution**: Verify Socket.IO connection and event listeners

### Issue 3: Key Loading Failures
**Cause**: Corrupted or missing keys in localStorage
**Solution**: Implement key validation and recovery mechanisms

### Issue 4: Message Display Issues
**Cause**: Incorrect data parsing or sender lookup
**Solution**: Improve error handling and data validation

## 📚 Learning Outcomes

### 1. Cryptographic Implementation
- Understanding of RSA encryption/decryption
- Implementation of digital signatures
- Key management best practices
- Web Crypto API integration

### 2. Real-time Communication
- Socket.IO implementation
- WebSocket security considerations
- Real-time data synchronization
- Connection management

### 3. Security Best Practices
- End-to-end encryption implementation
- Secure key storage
- Message integrity verification
- Authentication and authorization

### 4. Full-Stack Development
- React TypeScript development
- Node.js backend development
- Database design and management
- API design and implementation

## 🎯 Conclusion

This project successfully demonstrates the implementation of a secure, real-time chat application with end-to-end encryption. The journey involved solving complex cryptographic challenges, implementing real-time communication, and ensuring security best practices throughout the development process.

Key achievements:
- ✅ Implemented robust E2EE system
- ✅ Created real-time messaging with Socket.IO
- ✅ Built secure key management system
- ✅ Developed comprehensive testing framework
- ✅ Resolved critical security vulnerabilities
- ✅ Created scalable architecture

The application serves as a solid foundation for secure communication systems and demonstrates advanced web development techniques in the context of security and real-time communication.

---

**Note**: This documentation represents the complete development journey and should be updated as the project evolves. All cryptographic implementations follow industry standards and best practices for security. 
