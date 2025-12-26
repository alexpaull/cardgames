import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const UICard: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-lg p-6
        ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default UICard;
