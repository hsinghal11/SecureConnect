import React from "react";

type SideSlidingBarProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const SideSlidingBar: React.FC<SideSlidingBarProps> = ({ open, onClose, children }) => {
  return (
    <>
      {/* Remove or comment out the overlay below if you don't want the background to darken */}
      {/* 
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      */}
      {/* Sliding Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }} // Rounded right corners
      >
        <button
          className="absolute top-2 right-2 text-xl"
          onClick={onClose}
          style={{ zIndex: 10 }}
        >
          &times;
        </button>
        <div className="p-4 h-full overflow-y-auto">{children}</div>
      </div>
    </>
  );
};

export default SideSlidingBar;