// src/components/InputDialog/InputDialog.tsx
import React, { useState, useEffect } from 'react';
import './InputDialog.css';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

const InputDialog: React.FC<InputDialogProps> = ({ isOpen, title, message, onConfirm, onClose }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(inputValue);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="modal-input"
          autoFocus
        />
        <div className="modal-actions">
          <button onClick={handleConfirm}>Confirm</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default InputDialog;