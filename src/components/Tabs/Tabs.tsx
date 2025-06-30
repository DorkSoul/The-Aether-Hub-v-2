// src/components/Tabs.tsx
import React from 'react';

interface TabsProps {
  items: string[];
  activeItem: string;
  onItemClick: (item: string) => void;
}


const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    padding: '0',
    backgroundColor: '#282c34',
    gap: '5px',
};

const getTabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    margin: 0,
    padding: '4px 8px',
    fontSize: '0.9em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    color: 'white',
    border: isActive ? '1px solid white' : '1px solid transparent',
    opacity: isActive ? 1 : 0.7,
    transition: 'opacity 0.2s, border-color 0.25s',
});


const Tabs: React.FC<TabsProps> = ({ items, activeItem, onItemClick }) => {
  return (
    <div style={tabContainerStyle}>
      {items.map(item => (
        <button
          key={item}
          style={getTabButtonStyle(item === activeItem)}
          onClick={() => onItemClick(item)}
          onMouseEnter={(e) => {
              if (item !== activeItem) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.borderColor = '#646cff';
              }
          }}
          onMouseLeave={(e) => {
              if (item !== activeItem) {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.borderColor = 'transparent';
              }
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

export default Tabs;