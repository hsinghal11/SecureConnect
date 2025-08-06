import { useEffect, useState } from "react";
import { Routes, BrowserRouter, Route } from "react-router";
import { io, Socket } from "socket.io-client";
import LoginPage from "./page/Login";
import SignUpPage from "./page/signup";
import ChatComponent from "./page/ChatPage";
import Home from "./page/Home";
import Dashboard from "./page/dashBoard";
import PrivateRoute from "./PrivateRoute";
import TestPage from "./page/test";
// import { Button } from "./components/ui/button";
// import { Input } from "./components/ui/input";

const socket: Socket = io("http://localhost:8000", {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

function App() {
  useEffect(() => {
    console.log("Connecting to socket...");

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />{" "}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/test" element={<TestPage />} />

        <Route path="/dashboard" element={<PrivateRoute><Dashboard socket={socket} /></PrivateRoute>} />
        {/* Add more routes as needed */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
