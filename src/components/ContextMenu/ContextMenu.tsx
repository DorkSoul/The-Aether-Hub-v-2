// src/components/ContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  options: { label: string; action: () => void; }[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Style to position the menu at the cursor's location
  const menuStyle = {
    top: `${y}px`,
    left: `${x}px`,
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