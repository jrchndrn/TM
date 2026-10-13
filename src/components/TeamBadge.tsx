import React from 'react';

interface TeamBadgeProps {
  shortCode: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  shortCode,
  color = '#10b981',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-7 text-[10px]',
    md: 'w-8 h-9 text-xs',
    lg: 'w-11 h-12 text-sm',
    xl: 'w-16 h-18 text-base font-bold',
  };

  const code = (shortCode || 'CFC').slice(0, 3).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center font-display font-bold tracking-wider text-white shadow-sm shrink-0 transition-transform select-none ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: color,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)',
        borderTop: '2px solid rgba(255, 255, 255, 0.4)',
      }}
    >
      <span className="relative z-10 drop-shadow-sm pt-0.5">{code}</span>
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none" />
    </div>
  );
};
