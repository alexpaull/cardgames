'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PlayingCard } from '@/components/cards';
import { Button } from '@/components/ui';
import {
  HeartsState,
  createHeartsGame,
  passCards,
  executePassPhase,
  playCard,
  isValidPlay,
  getValidPlays,
  computerSelectPassCards,
  computerSelectCard,
  getWinner,
} from '@/lib/games/hearts';
import { Card } from '@/types';

interface HeartsGameProps {
  onBack?: () => void;
}

export const HeartsGame: React.FC<HeartsGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<HeartsState>(() =>
    createHeartsGame(['You', 'West', 'North', 'East'])
  );
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  const humanPlayer = gameState.players[0];
  const isHumanTurn = gameState.currentPlayerIndex === 0;

  // Compute message based on game state (avoids setState in effect)
  const message = useMemo(() => {
    if (gameState.phase === 'passing') {
      if (gameState.passDirection === 'none') {
        return 'No passing this round';
      } else if (humanPlayer.passedCards.length === 0) {
        return `Select 3 cards to pass ${gameState.passDirection}`;
      } else {
        return 'Waiting for others...';
      }
    } else if (gameState.phase === 'playing') {
      if (isHumanTurn) {
        return 'Your turn - click a card to play';
      } else {
        return `${gameState.players[gameState.currentPlayerIndex].name}'s turn`;
      }
    } else if (gameState.phase === 'roundEnd') {
      return 'Round complete!';
    } else if (gameState.phase === 'gameEnd') {
      const winner = getWinner(gameState);
      return winner ? `${winner.name} wins the game!` : 'Game Over!';
    }
    return '';
  }, [gameState, isHumanTurn, humanPlayer.passedCards.length]);

  // Computer AI turn
  useEffect(() => {
    if (gameState.phase === 'gameEnd') return;
    
    // Handle computer passing
    if (gameState.phase === 'passing') {
      const allComputersPassed = gameState.players
        .filter(p => p.type === 'computer')
        .every(p => p.passedCards.length === 3);
      
      if (!allComputersPassed) {
        const timer = setTimeout(() => {
          let newState = { ...gameState };
          for (const player of newState.players) {
            if (player.type === 'computer' && player.passedCards.length === 0) {
              const cardsToPass = computerSelectPassCards(player);
              const passed = passCards(newState, player.id, cardsToPass);
              if (passed) {
                newState = passed;
              }
            }
          }
          setGameState(newState);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    
    // Handle computer playing
    if (gameState.phase === 'playing' && !isHumanTurn) {
      const timer = setTimeout(() => {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const card = computerSelectCard(gameState, currentPlayer.id);
        if (card) {
          const newState = playCard(gameState, currentPlayer.id, card);
          if (newState) {
            setGameState(newState);
          }
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState, isHumanTurn]);

  // Execute pass phase when all have selected
  useEffect(() => {
    if (gameState.phase === 'passing' && 
        gameState.players.every(p => p.passedCards.length === 3)) {
      const timer = setTimeout(() => {
        const newState = executePassPhase(gameState);
        setGameState(newState);
        setSelectedCards([]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleCardClick = useCallback((card: Card) => {
    if (gameState.phase === 'passing' && humanPlayer.passedCards.length === 0) {
      // Toggle card selection for passing
      if (selectedCards.some(c => c.id === card.id)) {
        setSelectedCards(selectedCards.filter(c => c.id !== card.id));
      } else if (selectedCards.length < 3) {
        setSelectedCards([...selectedCards, card]);
      }
    } else if (gameState.phase === 'playing' && isHumanTurn) {
      // Try to play the card
      if (isValidPlay(gameState, humanPlayer.id, card)) {
        const newState = playCard(gameState, humanPlayer.id, card);
        if (newState) {
          setGameState(newState);
        }
      }
    }
  }, [gameState, humanPlayer, selectedCards, isHumanTurn]);

  const handlePassCards = useCallback(() => {
    if (selectedCards.length === 3) {
      const newState = passCards(gameState, humanPlayer.id, selectedCards);
      if (newState) {
        setGameState(newState);
        setSelectedCards([]);
      }
    }
  }, [gameState, humanPlayer.id, selectedCards]);

  const handleNewGame = useCallback(() => {
    setGameState(createHeartsGame(['You', 'West', 'North', 'East']));
    setSelectedCards([]);
  }, []);

  const validPlays = gameState.phase === 'playing' && isHumanTurn
    ? getValidPlays(gameState, humanPlayer.id)
    : [];

  const getPlayerPosition = (index: number): { className: string; name: string } => {
    const positions = [
      { className: 'bottom-4 left-1/2 -translate-x-1/2', name: 'You' },
      { className: 'left-4 top-1/2 -translate-y-1/2', name: 'West' },
      { className: 'top-4 left-1/2 -translate-x-1/2', name: 'North' },
      { className: 'right-4 top-1/2 -translate-y-1/2', name: 'East' },
    ];
    return positions[index];
  };

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
        </div>
        <div className="text-lg">
          Round {gameState.roundNumber} | Pass: {gameState.passDirection}
        </div>
      </div>

      {/* Message */}
      <div className="text-center mb-4">
        <span className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          {message}
        </span>
      </div>

      {/* Score display */}
      <div className="flex justify-center gap-8 mb-4 text-white">
        {gameState.players.map(player => (
          <div key={player.id} className={`text-center ${player.id === humanPlayer.id ? 'text-yellow-400' : ''}`}>
            <div className="font-bold">{player.name}</div>
            <div>Score: {player.score}</div>
            <div className="text-sm">({player.roundScore} this round)</div>
          </div>
        ))}
      </div>

      {/* Game area */}
      <div className="relative h-[500px] max-w-4xl mx-auto">
        {/* Current trick in center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
          {gameState.currentTrick.map(({ playerId, card }) => (
            <div key={card.id} className="relative">
              <PlayingCard card={card} size="md" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs">
                {gameState.players.find(p => p.id === playerId)?.name}
              </span>
            </div>
          ))}
        </div>

        {/* Other players' hands (face down) */}
        {[1, 2, 3].map(index => {
          const player = gameState.players[index];
          const pos = getPlayerPosition(index);
          return (
            <div key={player.id} className={`absolute ${pos.className}`}>
              <div className="text-white text-center mb-2">{player.name}</div>
              <div className="flex gap-1">
                {player.hand.slice(0, Math.min(5, player.hand.length)).map((_, i) => (
                  <div key={i} className="w-8 h-12 bg-blue-800 rounded border border-blue-900" />
                ))}
                {player.hand.length > 5 && (
                  <span className="text-white text-xs">+{player.hand.length - 5}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player's hand */}
      <div className="mt-8">
        <div className="flex justify-center gap-1 flex-wrap">
          {humanPlayer.hand.map(card => {
            const isSelected = selectedCards.some(c => c.id === card.id);
            const isValid = validPlays.some(c => c.id === card.id);
            
            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`cursor-pointer transition-transform ${
                  isSelected ? '-translate-y-4' : ''
                } ${
                  gameState.phase === 'playing' && !isValid ? 'opacity-50' : ''
                }`}
              >
                <PlayingCard card={card} size="md" selected={isSelected} />
              </div>
            );
          })}
        </div>

        {/* Pass button */}
        {gameState.phase === 'passing' && 
         humanPlayer.passedCards.length === 0 && 
         selectedCards.length === 3 && (
          <div className="text-center mt-4">
            <Button onClick={handlePassCards} size="lg">
              Pass Cards ({gameState.passDirection})
            </Button>
          </div>
        )}
      </div>

      {/* Game over modal */}
      {gameState.phase === 'gameEnd' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <div className="mb-4">
              {gameState.players
                .sort((a, b) => a.score - b.score)
                .map((player, index) => (
                  <div key={player.id} className={index === 0 ? 'text-green-600 font-bold' : ''}>
                    {index + 1}. {player.name}: {player.score} points
                  </div>
                ))}
            </div>
            <Button onClick={handleNewGame} size="lg">
              Play Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeartsGame;
