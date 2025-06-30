// src/components/PlayerCounterDisplay/PlayerCounterDisplay.tsx
import React, { useEffect, useRef, useState } from 'react';
import { UpArrowIcon, DownArrowIcon, RemoveIcon } from '../Icons/icons';
import './PlayerCounterDisplay.css';

interface PlayerCounterDisplayProps {
    counters: { [key: string]: number };
    playerId: string;
    x: number;
    y: number;
    onClose: () => void;
    onPlayerCounterApply: (playerId: string, counterType: string) => void;
    onPlayerCounterRemove: (playerId: string, counterType: string) => void;
    onRemoveAllPlayerCounters: (playerId: string, counterType: string) => void;
    onCounterSelect: (counterType: string) => void;
}

const PlayerCounterDisplay: React.FC<PlayerCounterDisplayProps> = ({ counters, playerId, x, y, onClose, onPlayerCounterApply, onPlayerCounterRemove, onRemoveAllPlayerCounters, onCounterSelect }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y, left: x, opacity: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [onClose]);

    useEffect(() => {
        if (menuRef.current) {
            const menuElement = menuRef.current;
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = menuElement;

            let newTop = y;
            let newLeft = x;

            if (x + offsetWidth > innerWidth) {
                newLeft = x - offsetWidth;
            }
            if (y + offsetHeight > innerHeight) {
                newTop = y - offsetHeight;
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

    return (
        <div className="player-counter-display" style={position} ref={menuRef}>
            <div className="counter-row header-row">
                <span className="header-label">#</span>
                <span className="header-label type-header">Type</span>
                <span className="header-label actions-header">Actions</span>
            </div>
            {Object.entries(counters).map(([type, count]) => (
                <div key={type} className="counter-row">
                    <span className="counter-amount">{count}</span>
                    <span className="counter-type clickable" onClick={() => onCounterSelect(type)}>{type}</span>
                    <div className="counter-actions">
                        <button onClick={() => onPlayerCounterApply(playerId, type)}><UpArrowIcon /></button>
                        <button onClick={() => onPlayerCounterRemove(playerId, type)}><DownArrowIcon /></button>
                        <button onClick={() => onRemoveAllPlayerCounters(playerId, type)}><RemoveIcon /></button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PlayerCounterDisplay;