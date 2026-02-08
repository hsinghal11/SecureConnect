// src/components/Navbar.tsx
// src/components/Navbar.tsx
import { Link } from "react-router-dom";
import { FaGithub } from "react-icons/fa"; // Import GitHub icon

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50  bg-opacity-10 backdrop-blur-sm  py-4 px-8">
      <div className="container mx-auto flex justify-between items-center max-w-7xl">
        {/* Logo/Brand Name */}
        <Link
          to="/"
          className="text-4xl  font-bold text-red-500 hover:text-purple-600 transition-colors duration-300"
        >
          SecureConnect
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6">
          <Link
            to="/signup"
            className="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-300"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-300"
          >
            Login
          </Link>
          {/* GitHub Icon Link */}
          <a
            href="https://github.com/your-repo-link" // Replace with your GitHub repo link
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-purple-600 transition-colors duration-300"
            aria-label="GitHub Repository"
          >
            <FaGithub className="w-6 h-6" />
          </a>
        </div>
      </div>
    </nav>
  );
}
