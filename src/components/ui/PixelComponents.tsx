import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'success' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => (
  <button
    className={`pixel-btn ${variant} ${size} ${className}`}
    {...props}
  >
    {children}
  </button>
);

interface PixelCardProps {
  children: React.ReactNode;
  gold?: boolean;
  className?: string;
  onClick?: () => void;
}

export const PixelCard: React.FC<PixelCardProps> = ({ children, gold, className = '', onClick }) => (
  <div
    className={`${gold ? 'pixel-border-gold' : 'pixel-border'} pixel-card ${className}`}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
  >
    {children}
  </div>
);

interface PixelModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const PixelModal: React.FC<PixelModalProps> = ({ title, onClose, children }) => (
  <div className="pixel-modal-overlay" onClick={onClose}>
    <div className="pixel-modal pixel-pop-in" onClick={(e) => e.stopPropagation()}>
      <h2>{title}</h2>
      {children}
    </div>
  </div>
);

interface RpgProgressProps {
  value: number; // 0-100
  label?: string;
  variant?: 'green' | 'gold' | 'danger';
}

export const RpgProgress: React.FC<RpgProgressProps> = ({ value, label, variant = 'green' }) => (
  <div className="rpg-progress">
    <div
      className={`rpg-progress-fill ${variant}`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
    {label && <span className="rpg-progress-label">{label}</span>}
  </div>
);

interface CurrencyDisplayProps {
  smallBeans: number;
  bigBeans: number;
  spinChances: number;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ smallBeans, bigBeans, spinChances }) => (
  <div className="currency-display">
    <div className="currency-item">
      <span className="icon">🫘</span>
      <span className="amount">{smallBeans}</span>
    </div>
    <div className="currency-item">
      <span className="icon">🌰</span>
      <span className="amount">{bigBeans}</span>
    </div>
    <div className="currency-item">
      <span className="icon">🎰</span>
      <span className="amount">{spinChances}</span>
    </div>
  </div>
);
