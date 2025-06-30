// src/components/GlobalActionBar/GlobalActionBar.tsx
import React, { useState } from 'react';
import type { PlayerState, ManaType } from '../../types';
import { WhiteManaIcon, BlueManaIcon, BlackManaIcon, RedManaIcon, GreenManaIcon, ColorlessManaIcon, CloseIcon } from '../Icons/icons';
import ContextMenu from '../ContextMenu/ContextMenu';
import './GlobalActionBar.css';

interface ManaCounterProps {
  type: ManaType;
  count: number;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const ManaCounter: React.FC<ManaCounterProps> = ({ type, count, onClick, onContextMenu }) => {
  const Icon = {
    white: WhiteManaIcon,
    blue: BlueManaIcon,
    black: BlackManaIcon,
    red: RedManaIcon,
    green: GreenManaIcon,
    colorless: ColorlessManaIcon,
  }[type];

  return (
    <div
      className="mana-counter"
      title={`${count} ${type} mana`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <Icon />
      <span className="mana-count">{count}</span>
    </div>
  );
};

interface GlobalActionBarProps {
    playerState: PlayerState;
    onUpdateMana: (playerId: string, manaType: ManaType, delta: number) => void;
    onResetMana: (playerId: string) => void;
    onPlayerCounterApply: (playerId: string, counterType: string) => void;
    heldCounter: string | null;
    setHeldCounter: (counter: string | null) => void;
}

const GlobalActionBar: React.FC<GlobalActionBarProps> = ({ playerState, onUpdateMana, onResetMana, onPlayerCounterApply, heldCounter, setHeldCounter }) => {
    const [xyCounterMenu, setXYCounterMenu] = useState<{ x: number, y: number } | null>(null);
    const [abilitiesMenu, setAbilitiesMenu] = useState<{ x: number, y: number } | null>(null);

    const handleXYCounterClick = (event: React.MouseEvent) => {
        event.preventDefault();
        setXYCounterMenu({ x: event.clientX, y: event.clientY });
    };

    const handleAbilitiesClick = (event: React.MouseEvent) => {
        event.preventDefault();
        setAbilitiesMenu({ x: event.clientX, y: event.clientY });
    };
    
    const handleCustomCounterClick = () => {
        const customCounterName = prompt("Enter counter name:");
        if (customCounterName) {
            setHeldCounter(customCounterName);
        }
    };

    const xyCounterOptions = [
        { label: '+1/+1', action: () => setHeldCounter('+1/+1') },
        { label: '-1/-1', action: () => setHeldCounter('-1/-1') },
        { label: '+1/0', action: () => setHeldCounter('+1/0') },
        { label: '-1/0', action: () => setHeldCounter('-1/0') },
        { label: '0/+1', action: () => setHeldCounter('0/+1') },
        { label: '0/-1', action: () => setHeldCounter('0/-1') },
    ];

    const abilities = [
      'deathtouch', 'defender', 'double strike', 'first strike', 'flying', 'goad', 
      'haste', 'hexproof', 'indestructible', 'lifelink', 'menace', 'reach', 
      'shroud', 'trample', 'vigilance'
    ].sort();
  
    const abilityOptions = abilities.map(ability => ({
        label: ability.charAt(0).toUpperCase() + ability.slice(1),
        action: () => setHeldCounter(ability),
    }));

    return (
        <div className="global-action-bar-content">
            <div className="mana-pool">
              {(Object.keys(playerState.mana) as ManaType[]).map(manaType => (
                <ManaCounter
                  key={manaType}
                  type={manaType}
                  count={playerState.mana[manaType]}
                  onClick={() => onUpdateMana(playerState.id, manaType, 1)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onUpdateMana(playerState.id, manaType, -1);
                  }}
                />
              ))}
              <button onClick={() => onResetMana(playerState.id)} className="reset-mana-btn" title="Reset all mana to 0">
                  <CloseIcon />
              </button>
            </div>
            <div className="counter-buttons">
                <button className="counter-btn" onClick={handleXYCounterClick} title="±X/±Y Counters">
                  ±X/±Y
                </button>
                <button className="counter-btn" onClick={handleAbilitiesClick} title="Ability Counters">
                  Abilities
                </button>
                <button className="counter-btn" onClick={handleCustomCounterClick} title="Custom Counters">
                  Custom
                </button>
            </div>
            {xyCounterMenu && (
            <ContextMenu
              x={xyCounterMenu.x}
              y={xyCounterMenu.y}
              onClose={() => setXYCounterMenu(null)}
              options={xyCounterOptions.map(opt => ({
                ...opt,
                action: () => {
                  opt.action();
                  setXYCounterMenu(null);
                }
              }))}
            />
          )}
          {abilitiesMenu && (
            <ContextMenu
              x={abilitiesMenu.x}
              y={abilitiesMenu.y}
              onClose={() => setAbilitiesMenu(null)}
              options={abilityOptions.map(opt => ({
                ...opt,
                action: () => {
                  opt.action();
                  setAbilitiesMenu(null);
                }
              }))}
            />
          )}
        </div>
    );
}

export default GlobalActionBar;