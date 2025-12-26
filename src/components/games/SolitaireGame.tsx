'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PlayingCard } from '@/components/cards';
import { Button } from '@/components/ui';
import {
  SolitaireState,
  createSolitaireGame,
  drawFromStock,
  moveToFoundation,
  moveCardsInTableau,
  moveWasteToTableau,
  checkAutoComplete,
  autoComplete,
} from '@/lib/games/solitaire';

interface SolitaireGameProps {
  onBack?: () => void;
}

export const SolitaireGame: React.FC<SolitaireGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<SolitaireState>(() => createSolitaireGame());
  const [selectedCard, setSelectedCard] = useState<{
    source: 'waste' | 'tableau';
    columnIndex?: number;
    cardIndex?: number;
  } | null>(null);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (gameState.isWon) return;
    
    const timer = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState.isWon]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStockClick = useCallback(() => {
    setGameState(state => drawFromStock(state));
    setMoves(m => m + 1);
    setSelectedCard(null);
  }, []);

  const handleWasteClick = useCallback(() => {
    if (gameState.waste.length === 0) return;
    setSelectedCard({ source: 'waste' });
  }, [gameState.waste.length]);

  const handleFoundationClick = useCallback((_foundationIndex: number) => {
    if (!selectedCard) return;
    
    let newState: SolitaireState | null = null;
    
    if (selectedCard.source === 'waste') {
      newState = moveToFoundation(gameState, 'waste');
    } else if (selectedCard.source === 'tableau' && selectedCard.columnIndex !== undefined) {
      newState = moveToFoundation(gameState, 'tableau', selectedCard.columnIndex);
    }
    
    if (newState) {
      setGameState(newState);
      setMoves(m => m + 1);
    }
    
    setSelectedCard(null);
  }, [selectedCard, gameState]);

  const handleTableauClick = useCallback((columnIndex: number, cardIndex?: number) => {
    // If no card selected, select this card
    if (!selectedCard) {
      if (cardIndex === undefined) return;
      const column = gameState.tableau[columnIndex];
      if (cardIndex >= column.length) return;
      if (!column[cardIndex].faceUp) return;
      
      setSelectedCard({
        source: 'tableau',
        columnIndex,
        cardIndex,
      });
      return;
    }
    
    // Try to move selected card(s) to this column
    let newState: SolitaireState | null = null;
    
    if (selectedCard.source === 'waste') {
      newState = moveWasteToTableau(gameState, columnIndex);
    } else if (selectedCard.source === 'tableau' && 
               selectedCard.columnIndex !== undefined && 
               selectedCard.cardIndex !== undefined) {
      newState = moveCardsInTableau(
        gameState,
        selectedCard.columnIndex,
        columnIndex,
        selectedCard.cardIndex
      );
    }
    
    if (newState) {
      setGameState(newState);
      setMoves(m => m + 1);
    }
    
    setSelectedCard(null);
  }, [selectedCard, gameState]);

  const handleAutoMove = useCallback(() => {
    // Try to move any card to foundation
    let newState = moveToFoundation(gameState, 'waste');
    if (newState) {
      setGameState(newState);
      setMoves(m => m + 1);
      return;
    }
    
    for (let col = 0; col < 7; col++) {
      newState = moveToFoundation(gameState, 'tableau', col);
      if (newState) {
        setGameState(newState);
        setMoves(m => m + 1);
        return;
      }
    }
  }, [gameState]);

  const handleNewGame = useCallback(() => {
    setGameState(createSolitaireGame());
    setMoves(0);
    setTime(0);
    setSelectedCard(null);
  }, []);

  const handleAutoComplete = useCallback(() => {
    if (checkAutoComplete(gameState)) {
      setGameState(autoComplete(gameState));
    }
  }, [gameState]);

  const canAutoComplete = checkAutoComplete(gameState);

  return (
    <div className="min-h-screen bg-green-800 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 text-white">
        <div className="flex gap-4">
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              ← Back
            </Button>
          )}
          <Button onClick={handleNewGame}>New Game</Button>
          <Button onClick={handleAutoMove} variant="secondary">
            Auto Move
          </Button>
          {canAutoComplete && (
            <Button onClick={handleAutoComplete} variant="success">
              Auto Complete
            </Button>
          )}
        </div>
        <div className="flex gap-8 text-lg">
          <span>Moves: {moves}</span>
          <span>Time: {formatTime(time)}</span>
        </div>
      </div>

      {/* Foundation and Stock */}
      <div className="flex justify-between mb-8">
        {/* Stock and Waste */}
        <div className="flex gap-4">
          {/* Stock pile */}
          <div
            onClick={handleStockClick}
            className="w-16 h-24 border-2 border-dashed border-green-600 rounded-lg 
                       flex items-center justify-center cursor-pointer"
          >
            {gameState.stock.length > 0 ? (
              <PlayingCard card={{ ...gameState.stock[0], faceUp: false }} size="md" />
            ) : (
              <span className="text-green-600 text-xs">Click to reset</span>
            )}
          </div>
          
          {/* Waste pile */}
          <div
            onClick={handleWasteClick}
            className={`w-16 h-24 border-2 border-dashed border-green-600 rounded-lg 
                       flex items-center justify-center cursor-pointer
                       ${selectedCard?.source === 'waste' ? 'ring-2 ring-yellow-400' : ''}`}
          >
            {gameState.waste.length > 0 ? (
              <PlayingCard 
                card={gameState.waste[gameState.waste.length - 1]} 
                size="md"
                selected={selectedCard?.source === 'waste'}
              />
            ) : null}
          </div>
        </div>

        {/* Foundation piles */}
        <div className="flex gap-4">
          {gameState.foundation.map((pile, index) => (
            <div
              key={index}
              onClick={() => handleFoundationClick(index)}
              className="w-16 h-24 border-2 border-dashed border-green-600 rounded-lg 
                        flex items-center justify-center cursor-pointer"
            >
              {pile.length > 0 ? (
                <PlayingCard card={pile[pile.length - 1]} size="md" />
              ) : (
                <span className="text-green-600 text-2xl">
                  {['♥', '♦', '♣', '♠'][index]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex justify-center gap-4">
        {gameState.tableau.map((column, colIndex) => (
          <div
            key={colIndex}
            onClick={() => handleTableauClick(colIndex)}
            className="w-16 min-h-[400px] relative"
          >
            {column.length === 0 ? (
              <div className="w-16 h-24 border-2 border-dashed border-green-600 rounded-lg" />
            ) : (
              column.map((card, cardIndex) => (
                <div
                  key={card.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTableauClick(colIndex, cardIndex);
                  }}
                  className="absolute"
                  style={{ top: cardIndex * 25 }}
                >
                  <PlayingCard
                    card={card}
                    size="md"
                    selected={
                      selectedCard?.source === 'tableau' &&
                      selectedCard.columnIndex === colIndex &&
                      selectedCard.cardIndex !== undefined &&
                      cardIndex >= selectedCard.cardIndex
                    }
                  />
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Win Modal */}
      {gameState.isWon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 You Won! 🎉</h2>
            <p className="text-gray-600 mb-4">
              Moves: {moves} | Time: {formatTime(time)}
            </p>
            <Button onClick={handleNewGame} size="lg">
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolitaireGame;
