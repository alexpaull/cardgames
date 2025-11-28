'use client';

import React from 'react';
import { Card as CardType } from '@/types';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  draggable?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

const sizeClasses = {
  sm: 'w-12 h-16 text-xs',
  md: 'w-16 h-24 text-sm',
  lg: 'w-24 h-36 text-lg',
};

export const PlayingCard: React.FC<CardProps> = ({
  card,
  onClick,
  selected = false,
  draggable = false,
  className = '',
  size = 'md',
}) => {
  if (!card.faceUp) {
    return (
      <div
        onClick={onClick}
        className={`
          ${sizeClasses[size]}
          bg-gradient-to-br from-blue-800 to-blue-950
          rounded-lg border-2 border-blue-900
          flex items-center justify-center
          cursor-pointer transition-all duration-200
          hover:shadow-lg
          ${selected ? 'ring-2 ring-yellow-400 -translate-y-2' : ''}
          ${className}
        `}
        draggable={draggable}
      >
        <div className="text-blue-400 opacity-50 text-2xl">♠</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        bg-white rounded-lg border-2 border-gray-300
        flex flex-col justify-between p-1
        cursor-pointer transition-all duration-200
        hover:shadow-lg
        ${selected ? 'ring-2 ring-yellow-400 -translate-y-2' : ''}
        ${suitColors[card.suit]}
        ${className}
      `}
      draggable={draggable}
    >
      <div className="text-left font-bold">{card.rank}</div>
      <div className="text-center text-2xl">{suitSymbols[card.suit]}</div>
      <div className="text-right font-bold rotate-180">{card.rank}</div>
    </div>
  );
};

export default PlayingCard;
