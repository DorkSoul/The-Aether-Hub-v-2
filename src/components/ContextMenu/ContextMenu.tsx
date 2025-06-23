// src/components/ContextMenu/ContextMenu.tsx
import React, { useEffect, useRef, useState } from 'react';
import { TextWithMana } from '../TextWithMana/TextWithMana';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  options: { label: string; action: () => void; }[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x, opacity: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const menuElement = menuRef.current;
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuElement;

      let newTop = y;
      let newLeft = x;

      if (y + offsetHeight > innerHeight) {
        newTop = y - offsetHeight;
      }
      if (x + offsetWidth > innerWidth) {
        newLeft = x - offsetWidth;
      }
      if (newTop < 0) {
        newTop = 5;
      }
      if (newLeft < 0) {
        newLeft = 5;
      }
      setPosition({ top: newTop, left: newLeft, opacity: 1 });
    }
  }, [x, y]);

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
              <TextWithMana text={option.label} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ContextMenu;