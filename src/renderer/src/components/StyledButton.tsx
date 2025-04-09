import React from 'react';

export interface StyledButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const StyledButton: React.FC<StyledButtonProps> = ({ onClick, children, className = '', style }) => {
  return (
    <button className={`styled-button ${className}`} onClick={onClick} style={style}>
      {children}
    </button>
  );
};

export default StyledButton; 