// src/components/Tabs.tsx
import React from 'react';

interface TabsProps {
  items: string[];
  activeItem: string;
  onItemClick: (item: string) => void;
}

// Simple styling for the tabs, can be expanded in App.css
const tabStyle: React.CSSProperties = {
    display: 'flex',
    padding: '5px',
    backgroundColor: '#282c34',
    gap: '5px',
};

const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 15px',
    cursor: 'pointer',
    border: '1px solid #555',
    backgroundColor: isActive ? '#646cff' : '#1a1a1a',
    color: 'white',
    borderRadius: '4px',
});

const Tabs: React.FC<TabsProps> = ({ items, activeItem, onItemClick }) => {
  return (
    <div style={tabStyle}>
      {items.map(item => (
        <button
          key={item}
          style={tabButtonStyle(item === activeItem)}
          onClick={() => onItemClick(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

export default Tabs;