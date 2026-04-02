// src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import Navbar from "@/components/navbar"; 
// You'll want to replace this with your actual image
// Example image import (ensure it's in your public folder or set up with webpack/vite)
import heroImage from "/chat.jpg"; // Example path, adjust as needed

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-rose-200 flex flex-col">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 py-20">
        {" "}
        {/* py-20 to account for fixed navbar */}
        <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center max-w-7xl">
          {/* Left Content Section */}
          <div className="text-center md:text-left space-y-6">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
              Unleash <span className="text-purple-600">Secure</span> &{" "}
              <span className="text-rose-500">Intelligent</span> Communication
            </h1>
            <p className="text-lg text-gray-700 max-w-md mx-auto md:mx-0">
              Experience the power of{" "}
              <span className=" font-bold">End-to-End Encryption (E2E)</span>{" "}
              for unbreakable privacy and{" "}
              <span className="font-bold">Fuzzy Search</span> for finding
              anything, even with typos. Your data, always secure, always
              accessible.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link to="/dashboard">
                <button className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 transition-transform duration-300 transform hover:scale-105">
                  Go to chats
                </button>
              </Link>
              <Link to="/signup">
                <button className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 transition-transform duration-300 transform hover:scale-105">
                  Get Started Now
                </button>
              </Link>
              <Link to="/login">
                <button className="px-8 py-3 bg-white text-purple-600 border border-purple-600 font-semibold rounded-lg shadow-lg hover:bg-purple-50 transition-transform duration-300 transform hover:scale-105">
                  Learn More
                </button>
              </Link>
            </div>
          </div>

          {/* Right Image Section with Tilt */}
          <div className="flex justify-center md:justify-end">
            <img
              src={heroImage}
              alt="Secure Communication Illustration"
              className="w-full max-w-4xl h-auto rounded-xl shadow-2xl transition-transform duration-500 ease-in-out transform rotate-3 hover:rotate-0 hover:scale-105"
              style={
                {
                  // You can adjust the tilt directly here or via a class
                  // For a fixed subtle tilt: transform: 'rotate(3deg)'
                  // For a more dynamic tilt (e.g., on hover): use Tailwind's hover:rotate-0
                }
              }
            />
          </div>
        </div>
      </main>

      {/* Optional: Add a simple footer */}
      <footer className="py-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} SecureConnect. All rights reserved.
      </footer>
    </div>
  );
}
