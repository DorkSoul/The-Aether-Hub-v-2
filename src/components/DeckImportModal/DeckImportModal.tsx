// src/components/DeckImportModal.tsx
import React, { useState, useEffect } from 'react';
import './DeckImportModal.css';

interface DeckImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deckName: string, decklist: string) => void;
}

const DeckImportModal: React.FC<DeckImportModalProps> = ({ isOpen, onClose, onSave }) => {
  const [deckName, setDeckName] = useState('');
  const [decklist, setDecklist] = useState('');

  // This effect runs when the 'isOpen' prop changes.
  // If the modal is being opened, it resets the state for the input fields.
  useEffect(() => {
    if (isOpen) {
      setDeckName('');
      setDecklist('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (deckName.trim() && decklist.trim()) {
      onSave(deckName, decklist);
      onClose();
    } else {
      alert('Please provide a deck name and a decklist.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Import New Deck</h2>
        <input
          type="text"
          placeholder="Enter Deck Name"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="modal-input"
        />
        <textarea
          placeholder="Paste decklist here, one card per line..."
          value={decklist}
          onChange={(e) => setDecklist(e.target.value)}
          className="modal-textarea"
        />
        <div className="modal-actions">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DeckImportModal;