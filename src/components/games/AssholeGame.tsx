'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PlayingCard } from '@/components/cards';
import { Button } from '@/components/ui';
import {
  AssholeState,
  createAssholeGame,
  playCards,
  pass,
  isValidPlay,
  getValidPlays,
  computerSelectPlay,
  startNewRound,
  getWinner,
} from '@/lib/games/asshole';
import { Card } from '@/types';

interface AssholeGameProps {
  onBack?: () => void;
}

export const AssholeGame: React.FC<AssholeGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<AssholeState>(() =>
    createAssholeGame(
      ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
      ['human', 'computer', 'computer', 'computer']
    )
  );
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [message, setMessage] = useState<string>('');

  const humanPlayer = gameState.players[0];
  const isHumanTurn = gameState.currentPlayerIndex === 0 && humanPlayer.hand.length > 0;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Computer AI turns
  useEffect(() => {
    if (gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.type !== 'computer' || currentPlayer.hand.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const cards = computerSelectPlay(gameState, currentPlayer.id);
      
      if (cards) {
        const newState = playCards(gameState, currentPlayer.id, cards);
        if (newState) {
          setGameState(newState);
        }
      } else {
        // Pass
        const newState = pass(gameState, currentPlayer.id);
        if (newState) {
          setGameState(newState);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState]);

  // Update message
  useEffect(() => {
    if (gameState.phase === 'roundEnd') {
      const winner = getWinner(gameState);
      if (winner) {
        setMessage(`${winner.name} is the President!`);
      }
    } else if (isHumanTurn) {
      if (gameState.currentRank === null) {
        setMessage('Your turn - play any cards to start');
      } else {
        const validPlays = getValidPlays(gameState, humanPlayer.id);
        if (validPlays.length === 0) {
          setMessage('No valid plays - you must pass');
        } else {
          setMessage('Your turn - play higher cards or pass');
        }
      }
    } else if (currentPlayer.hand.length > 0) {
      setMessage(`${currentPlayer.name}'s turn`);
    }
  }, [gameState, isHumanTurn, humanPlayer.id, currentPlayer]);

  const handleCardClick = useCallback((card: Card) => {
    if (!isHumanTurn) return;
    
    // Toggle selection - only allow same rank cards
    if (selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      if (selectedCards.length === 0 || selectedCards[0].rank === card.rank) {
        setSelectedCards([...selectedCards, card]);
      } else {
        // Different rank - start new selection
        setSelectedCards([card]);
      }
    }
  }, [isHumanTurn, selectedCards]);

  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0) return;
    
    const newState = playCards(gameState, humanPlayer.id, selectedCards);
    if (newState) {
      setGameState(newState);
      setSelectedCards([]);
    }
  }, [gameState, humanPlayer.id, selectedCards]);

  const handlePass = useCallback(() => {
    if (gameState.currentRank === null) return; // Can't pass on empty pile
    
    const newState = pass(gameState, humanPlayer.id);
    if (newState) {
      setGameState(newState);
      setSelectedCards([]);
    }
  }, [gameState, humanPlayer.id]);

  const handleNewRound = useCallback(() => {
    const newState = startNewRound(gameState);
    setGameState(newState);
    setSelectedCards([]);
    setMessage('');
  }, [gameState]);

  const handleNewGame = useCallback(() => {
    setGameState(createAssholeGame(
      ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
      ['human', 'computer', 'computer', 'computer']
    ));
    setSelectedCards([]);
    setMessage('');
  }, []);

  const validPlays = isHumanTurn ? getValidPlays(gameState, humanPlayer.id) : [];
  const canPlaySelected = selectedCards.length > 0 && isValidPlay(gameState, humanPlayer.id, selectedCards);
  const canPass = isHumanTurn && gameState.currentRank !== null;

  const getRankDisplay = (rank: string | null): string => {
    if (!rank) return '';
    const displays: Record<string, string> = {
      'president': '👑 President',
      'vice-president': '🥈 Vice President',
      'neutral': '😐 Neutral',
      'vice-asshole': '💩 Vice Asshole',
      'asshole': '🚽 Asshole',
    };
    return displays[rank] || '';
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
          Round {gameState.roundNumber}
        </div>
      </div>

      {/* Message */}
      <div className="text-center mb-4">
        <span className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          {message}
        </span>
      </div>

      {/* Other players */}
      <div className="flex justify-center gap-8 mb-8">
        {gameState.players.slice(1).map(player => (
          <div key={player.id} className="text-center text-white">
            <div className="font-bold">
              {player.name}
              {player.rank && <span className="ml-2 text-sm">{getRankDisplay(player.rank)}</span>}
            </div>
            <div className="text-sm">
              {player.hand.length} cards
              {player.finishOrder && <span className="ml-2 text-green-400">Finished #{player.finishOrder}</span>}
            </div>
            <div className="flex gap-1 justify-center mt-2">
              {player.hand.slice(0, Math.min(5, player.hand.length)).map((_, i) => (
                <div key={i} className="w-8 h-12 bg-blue-800 rounded border border-blue-900" />
              ))}
              {player.hand.length > 5 && (
                <span className="text-white text-xs">+{player.hand.length - 5}</span>
              )}
            </div>
            {player.hasPassed && <div className="text-yellow-400 text-sm">Passed</div>}
          </div>
        ))}
      </div>

      {/* Current pile */}
      <div className="flex flex-col items-center mb-8">
        <div className="text-white mb-2">
          {gameState.pile.length > 0 ? (
            <>Current Play: {gameState.currentCount} card(s) of rank {gameState.currentRank}</>
          ) : (
            'No cards played yet - play any cards'
          )}
        </div>
        <div className="flex gap-2 min-h-[100px] items-center">
          {gameState.pile.length > 0 && (
            gameState.pile[gameState.pile.length - 1].map(card => (
              <PlayingCard key={card.id} card={{ ...card, faceUp: true }} size="lg" />
            ))
          )}
        </div>
        {gameState.lastPlayedBy && (
          <div className="text-white text-sm mt-2">
            Last played by: {gameState.players.find(p => p.id === gameState.lastPlayedBy)?.name}
          </div>
        )}
      </div>

      {/* Player info */}
      <div className="text-center text-white mb-4">
        <span className="text-xl font-bold">{humanPlayer.name}</span>
        {humanPlayer.rank && (
          <span className="ml-4">{getRankDisplay(humanPlayer.rank)}</span>
        )}
        {humanPlayer.finishOrder && (
          <span className="ml-4 text-green-400">Finished #{humanPlayer.finishOrder}</span>
        )}
      </div>

      {/* Player's hand */}
      <div className="flex justify-center gap-1 flex-wrap mb-8">
        {humanPlayer.hand.map(card => {
          const isSelected = selectedCards.some(c => c.id === card.id);
          const isPlayable = validPlays.some(play => play.some(c => c.id === card.id));
          
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`cursor-pointer transition-transform ${
                isSelected ? '-translate-y-4' : ''
              } ${
                !isPlayable && selectedCards.length === 0 ? 'opacity-50' : ''
              }`}
            >
              <PlayingCard card={{ ...card, faceUp: true }} size="md" selected={isSelected} />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {isHumanTurn && humanPlayer.hand.length > 0 && (
          <>
            <Button 
              onClick={handlePlay} 
              disabled={!canPlaySelected}
              variant="success"
            >
              Play {selectedCards.length > 0 ? `(${selectedCards.length})` : ''}
            </Button>
            <Button 
              onClick={handlePass} 
              disabled={!canPass}
              variant="secondary"
            >
              Pass
            </Button>
          </>
        )}

        {gameState.phase === 'roundEnd' && (
          <Button onClick={handleNewRound} size="lg">
            Next Round
          </Button>
        )}
      </div>

      {/* Round end modal */}
      {gameState.phase === 'roundEnd' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Round Complete!</h2>
            <div className="mb-4">
              {gameState.players
                .filter(p => p.finishOrder)
                .sort((a, b) => (a.finishOrder || 0) - (b.finishOrder || 0))
                .map(player => (
                  <div key={player.id} className="text-lg">
                    {getRankDisplay(player.rank)} - {player.name}
                  </div>
                ))}
            </div>
            <Button onClick={handleNewRound} size="lg">
              Play Next Round
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssholeGame;
