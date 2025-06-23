// src/components/TextWithMana/TextWithMana.tsx
import React from 'react';
import { WhiteManaIcon, BlueManaIcon, BlackManaIcon, RedManaIcon, GreenManaIcon, ColorlessManaIcon } from '../Icons/icons';
import './TextWithMana.css';

// A simple Tap icon component
const TapIcon = () => (
    <svg viewBox="0 0 100 100" className="mana-icon-inline tap-icon">
        <path d="M 85,50 A 35,35 0 1 1 50,15" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
        <path d="M 50,15 L 30,30 M 50,15 L 70,30" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
    </svg>
);

const symbolToIcon: { [key: string]: React.FC<any> } = {
    'W': WhiteManaIcon,
    'U': BlueManaIcon,
    'B': BlackManaIcon,
    'R': RedManaIcon,
    'G': GreenManaIcon,
    'C': ColorlessManaIcon,
    'T': TapIcon,
};

export const TextWithMana: React.FC<{ text: string }> = ({ text }) => {
    // Regex to find all {X} style symbols, keeping the delimiters
    const parts = text.split(/({[^{}]+})/g).filter(part => part);

    const elements = parts.map((part, index) => {
        if (part.startsWith('{') && part.endsWith('}')) {
            const symbol = part.slice(1, -1);

            // Handle numeric mana costs, e.g., {3}
            const numericValue = parseInt(symbol, 10);
            if (!isNaN(numericValue) && String(numericValue) === symbol) {
                // Render N colorless mana icons
                return (
                    <span key={index} className="mana-symbol-group">
                        {Array.from({ length: numericValue }).map((_, i) => <ColorlessManaIcon key={i} className="mana-icon-inline" />)}
                    </span>
                );
            }
            
            // Handle regular symbols like {W}, {U}, {T}
            const IconComponent = symbolToIcon[symbol.toUpperCase()];
            if (IconComponent) {
                return <IconComponent key={index} className="mana-icon-inline" />;
            }
        }
        return <span key={index}>{part}</span>;
    });

    return <>{elements}</>;
};