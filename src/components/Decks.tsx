// src/components/Decks.tsx
import React, { useState } from 'react';
import type { Card as CardType, CardIdentifier } from '../types';
import { getCardsFromNames, getCardByUri } from '../api/scryfall';
import { groupCardsByType } from '../utils/cardUtils';
import { parseDecklist } from '../utils/parsing';
import DeckImportModal from './DeckImportModal';
import Card from './Card';

interface DecksProps {
  imageDirectoryHandle: FileSystemDirectoryHandle | null;
}

type GroupedCards = Record<string, CardType[]>;

const Decks: React.FC<DecksProps> = ({ imageDirectoryHandle }) => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [deckFiles, setDeckFiles] = useState<FileSystemFileHandle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupedCards, setGroupedCards] = useState<GroupedCards>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(''); // State for the user notification

  const refreshDeckList = async (dirHandle: FileSystemDirectoryHandle) => {
    const files = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
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
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.info("User cancelled the folder selection dialog.");
      } else {
        console.error("Error selecting folder:", err);
      }
    }
  };

  const handleSaveDeck = async (deckName: string, decklistText: string) => {
    if (!directoryHandle) return;

    // Clear any previous messages when starting a new import
    setNotification('');
    setError('');
    setIsLoading(true);
    setLoadingMessage('Importing deck...');

    try {
      const decklistIdentifiers = parseDecklist(decklistText);
      const uniqueIdentifiers = [...new Set(decklistIdentifiers.map(id => JSON.stringify(id)))].map(s => JSON.parse(s) as CardIdentifier);

      setLoadingMessage(`Fetching ${uniqueIdentifiers.length} unique cards...`);
      const fetchedCards: CardType[] = await getCardsFromNames(uniqueIdentifiers);
      
      const meldResultUrisToFetch = new Set<string>();
      fetchedCards.forEach(card => {
        if (card.layout === 'meld' && card.all_parts) {
          const meldPart = card.all_parts.find(p => p.component === 'meld_result');
          if (meldPart) meldResultUrisToFetch.add(meldPart.uri);
        }
      });

      const meldResults: CardType[] = [];
      if (meldResultUrisToFetch.size > 0) {
        setLoadingMessage(`Fetching ${meldResultUrisToFetch.size} meld result cards (1 per second)...`);
        for (const uri of meldResultUrisToFetch) {
            await new Promise(res => setTimeout(res, 1000));
            try {
                const meldCard = await getCardByUri(uri);
                meldResults.push(meldCard);
            } catch (err) {
                console.error(`Failed to fetch meld card from ${uri}`, err);
            }
        }
        const meldResultMap = new Map(meldResults.map(c => [c.id, c]));
        fetchedCards.forEach(card => {
          if (card.layout === 'meld' && card.all_parts) {
            const meldPart = card.all_parts.find(p => p.component === 'meld_result');
            if (meldPart && meldResultMap.has(meldPart.id)) {
              card.meld_result_card = meldResultMap.get(meldPart.id);
            }
          }
        });
      }
      
      const cardApiDataBySetAndNumber = new Map<string, CardType>();
      const cardApiDataByName = new Map<string, CardType>();
      fetchedCards.forEach(card => {
        cardApiDataBySetAndNumber.set(`${card.set}|${card.collector_number}`, card);
        cardApiDataByName.set((card.name.split('//')[0].trim()).toLowerCase(), card);
      });

      const fullDeckCards: CardType[] = decklistIdentifiers.map(id => {
        if (id.set && id.collector_number) {
          return cardApiDataBySetAndNumber.get(`${id.set}|${id.collector_number}`);
        } else if (id.name) {
          return cardApiDataByName.get(id.name.toLowerCase());
        }
        return undefined;
      }).filter((c): c is CardType => c !== undefined);

      if (fullDeckCards.length !== decklistIdentifiers.length) {
        setError("Warning: Some cards could not be found and were not included in the saved deck.");
      }
      
      setLoadingMessage('Saving deck file...');
      const deckDataToSave = { name: deckName, cards: fullDeckCards };
      const deckJsonString = JSON.stringify(deckDataToSave, null, 2);
      const fileName = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(deckJsonString);
      await writable.close();

      await refreshDeckList(directoryHandle);

      // --- NEW ---
      // Automatically open the deck in the main view.
      setGroupedCards(groupCardsByType(fullDeckCards));

      // Set the notification message for the user.
      setNotification('Deck imported! Card images are downloading for the first time. This may be slow, but future loads will be instant from your local cache.');
      // --- END NEW ---

    } catch (err) {
      console.error("Error importing deck:", err);
      setError(err instanceof Error ? err.message : "Failed to import deck. Check console for details.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDeckSelected = async (fileHandle: FileSystemFileHandle) => {
    // Clear any previous messages when loading a new deck
    setNotification('');
    setError('');
    setIsLoading(true);
    setLoadingMessage('Loading deck from local file...');
    setGroupedCards({});

    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      const deckData: { name: string; cards: CardType[] } = JSON.parse(text);
      if (!deckData.cards || deckData.cards.length === 0) {
        setIsLoading(false);
        return;
      }
      setGroupedCards(groupCardsByType(deckData.cards));
    } catch (err) {
      console.error("Error loading deck from JSON:", err);
      setError(err instanceof Error ? err.message : "Failed to load deck file. The file might be corrupted.");
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
            <ul>{deckFiles.map(file => (<li key={file.name} onClick={() => handleDeckSelected(file)} className="list-item">{file.name.replace('.json', '')}</li>))}</ul>
          </div>
          <div className="spoiler-view-pane">
            {notification && <p className="notification-message">{notification}</p>}
            {isLoading && <h2>{loadingMessage}</h2>}
            {error && <p className="error-message">{error}</p>}
            {!isLoading && Object.entries(groupedCards).map(([type, cards]) => (
              <div key={type} className="card-type-section">
                <h3 className="section-header" onClick={() => toggleSection(type)}>
                  {type} ({cards.length})<span>{collapsedSections[type] ? ' (Click to expand)' : ''}</span>
                </h3>
                {!collapsedSections[type] && (
                  <div className="cards-container">
                    {cards.map((card, index) => (
                      <Card key={`${card.id}-${index}`} card={card} imageDirectoryHandle={imageDirectoryHandle} />
                    ))}
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