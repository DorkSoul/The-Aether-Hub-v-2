// src/components/ContextMenu/ContextMenu.tsx
import React, { useEffect, useRef, useState } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  options: { label: string; action: () => void; }[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  // State to hold the final, adjusted position of the menu.
  const [position, setPosition] = useState({ top: y, left: x, opacity: 0 });

  // Effect to handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Add event listener when the menu is open
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Clean up the event listener when the menu is closed
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // --- MODIFIED ---
  // This effect adjusts the menu's position to fit within the viewport after it renders.
  useEffect(() => {
    if (menuRef.current) {
      const menuElement = menuRef.current;
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuElement;

      let newTop = y;
      let newLeft = x;

      // If the menu would go off the bottom of the screen, move it up above the cursor.
      if (y + offsetHeight > innerHeight) {
        newTop = y - offsetHeight;
      }

      // If the menu would go off the right of the screen, move it to the left of the cursor.
      if (x + offsetWidth > innerWidth) {
        newLeft = x - offsetWidth;
      }
      
      // Ensure the menu doesn't go off the top or left edges of the screen.
      if (newTop < 0) {
        newTop = 5; // Add a small buffer
      }
      if (newLeft < 0) {
        newLeft = 5; // Add a small buffer
      }

      // Set the final position and make it visible.
      setPosition({ top: newTop, left: newLeft, opacity: 1 });
    }
  }, [x, y]); // Rerun this logic if the initial click coordinates change.

  // Style to position the menu at the calculated location.
  // It's initially invisible (opacity: 0) to prevent a flicker before its position is adjusted.
  const menuStyle = {
    top: `${position.top}px`,
    left: `${position.left}px`,
    opacity: position.opacity,
  };

  return (
    <div className="context-menu-backdrop" onClick={onClose}>
      <div className="context-menu" style={menuStyle} ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <ul>
          {options.map((option, index) => (
            <li key={index} onClick={() => { option.action(); onClose(); }}>
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ContextMenu;