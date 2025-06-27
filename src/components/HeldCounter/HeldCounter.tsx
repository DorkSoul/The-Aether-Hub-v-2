// src/components/HeldCounter/HeldCounter.tsx
import React from 'react';
import './HeldCounter.css';

interface HeldCounterProps {
    text: string;
    x: number;
    y: number;
}

const HeldCounter: React.FC<HeldCounterProps> = ({ text, x, y }) => {
    const style = {
        position: 'fixed' as const,
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(15px, 15px)', // Offset from cursor
    };

    return (
        <div className="held-counter" style={style}>
            {text}
        </div>
    );
};

export default HeldCounter;