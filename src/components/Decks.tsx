// src/components/Decks.tsx
import React, { useState, useEffect } from 'react';
import type { Card } from '../types';
import { getCardsFromNames } from '../api/scryfall';
import { groupCardsByType } from '../utils/cardUtils';
import { parseDecklist } from '../utils/parsing';
import { saveCardsToDB, getCardsFromDB } from '../utils/db';
import DeckImportModal from './DeckImportModal';

type GroupedCards = Record<string, Card[]>;

const Decks: React.FC = () => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [deckFiles, setDeckFiles] = useState<FileSystemFileHandle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupedCards, setGroupedCards] = useState<GroupedCards>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  const refreshDeckList = async (dirHandle: FileSystemDirectoryHandle) => {
    const files = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
        files.push(entry);
      }
    }
    setDeckFiles(files);
  };

  const handleSelectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setDirectoryHandle(dirHandle);
      await refreshDeckList(dirHandle);
      setGroupedCards({});
    } catch (err) {
      console.info("Directory picker was closed.", err);
    }
  };

  // --- REFACTORED DECK IMPORT & SAVE LOGIC ---
  const handleSaveDeck = async (deckName: string, decklistText: string) => {
    if (!directoryHandle) return;

    setIsLoading(true);
    setError('');

    try {
      // 1. Parse decklist to get individual card names
      const allCardNames = parseDecklist(decklistText);
      const uniqueNames = [...new Set(allCardNames)];

      // 2. Fetch from Scryfall API
      setLoadingMessage(`Fetching ${uniqueNames.length} cards from Scryfall...`);
      const cardsFromApi = await getCardsFromNames(uniqueNames);

      // 3. Cache fetched cards in our local DB
      setLoadingMessage('Saving cards to local database...');
      await saveCardsToDB(cardsFromApi);

      // 4. Save the original decklist text to a .txt file
      setLoadingMessage('Saving deck file...');
      const fileName = deckName.endsWith('.txt') ? deckName : `${deckName}.txt`;
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(decklistText);
      await writable.close();

      // 5. Refresh the file list
      await refreshDeckList(directoryHandle);

    } catch (err) {
      console.error("Error importing deck:", err);
      setError("Failed to import deck. Check console for details.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // --- REFACTORED DECK SELECTION LOGIC ---
  const handleDeckSelected = async (fileHandle: FileSystemFileHandle) => {
    setIsLoading(true);
    setLoadingMessage('Loading deck from local database...');
    setError('');
    setGroupedCards({});

    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const cardNames = parseDecklist(text);

      if (cardNames.length === 0) return;

      // We need Scryfall IDs to efficiently query our DB.
      // This is a simplified approach; a real app might store a name->id map.
      // For now, we'll fetch from DB using a name-based query if we had one,
      // but our DB is keyed by ID. So we must fetch from API first to get IDs,
      // then check DB. Let's adjust the flow.
      
      const uniqueNames = [...new Set(cardNames)];
      const cardsFromApi = await getCardsFromNames(uniqueNames);
      
      // Now, map the full decklist to the fetched card data
      const nameToCardMap = new Map<string, Card>();
      cardsFromApi.forEach(card => nameToCardMap.set(card.name, card));

      const fullDeckCards = cardNames.map(name => nameToCardMap.get(name)).filter(Boolean) as Card[];
      
      setGroupedCards(groupCardsByType(fullDeckCards));

    } catch (err) {
      console.error("Error loading deck:", err);
      setError("Failed to load deck. The file might be corrupted or cards not found.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  return (
    <>
      <DeckImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveDeck} />
      <div className="deck-builder">
        <div className="deck-controls">
          <button onClick={handleSelectFolder}>Load Decks Folder</button>
          <button onClick={() => setIsModalOpen(true)} disabled={!directoryHandle}>
            Import New Deck
          </button>
        </div>
        <div className="deck-content">
          <div className="deck-list-pane">
            <h3>Decks</h3>
            <ul>{deckFiles.map(file => (<li key={file.name} onClick={() => handleDeckSelected(file)} className="list-item">{file.name}</li>))}</ul>
          </div>
          <div className="spoiler-view-pane">
            {isLoading && <h2>{loadingMessage}</h2>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && Object.entries(groupedCards).map(([type, cards]) => (
              <div key={type} className="card-type-section">
                <h3 className="section-header" onClick={() => toggleSection(type)}>
                  {type} ({cards.length})<span>{collapsedSections[type] ? ' (Click to expand)' : ''}</span>
                </h3>
                {!collapsedSections[type] && (
                  <div className="cards-container">
                    {cards.map(card => (<div key={card.id} className="card"><img src={card.image_uris.normal} alt={card.name} /></div>))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Decks;