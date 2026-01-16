import React from 'react';

export const CyberCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`border border-[#00ff41] bg-black/90 p-6 relative ${className}`}>
    {/* Corner accents */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#00ff41]" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#00ff41]" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#00ff41]" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#00ff41]" />
    
    {title && (
      <div className="absolute -top-3 left-4 bg-[#0a0a0a] px-2 text-[#00ff41] text-sm font-bold tracking-widest uppercase border-l border-r border-[#00ff41]">
        {title}
      </div>
    )}
    {children}
  </div>
);

export const CyberButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "uppercase tracking-wider font-bold text-sm px-6 py-3 transition-all duration-200 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#003b0f] text-[#00ff41] border border-[#00ff41] hover:bg-[#00ff41] hover:text-black hover:shadow-[0_0_10px_#00ff41]",
    danger: "bg-transparent text-red-500 border border-red-500 hover:bg-red-900/20 hover:shadow-[0_0_10px_#ef4444]",
    ghost: "bg-transparent text-[#00ff41] hover:bg-[#003b0f] border border-transparent hover:border-[#003b0f]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export const CyberInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs uppercase tracking-widest text-[#00ff41]/70 mb-2">{label}</label>}
    <input 
      className={`w-full bg-black border border-[#00ff41]/50 p-3 text-sm text-white font-mono focus:border-[#00ff41] focus:shadow-[0_0_10px_#00ff41] focus:outline-none transition-all placeholder-[#00ff41]/20 ${className}`}
      {...props}
    />
  </div>
);

export const StatusBadge: React.FC<{ label: string; status: 'ON' | 'OFF' | 'OK' | 'PENDING' | 'PROPAGATING'; size?: 'sm' | 'md' }> = ({ label, status, size = 'md' }) => {
  const getColor = () => {
    switch (status) {
      case 'ON':
      case 'OK': return 'text-[#00ff41] border-[#00ff41]';
      case 'OFF': return 'text-red-500 border-red-500';
      case 'PENDING': 
      case 'PROPAGATING': return 'text-yellow-500 border-yellow-500';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  const colorClass = getColor();
  const textSize = size === 'sm' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-2 py-1';

  return (
    <div className={`flex items-center gap-2 font-mono uppercase ${size === 'sm' ? 'flex-col gap-0.5' : ''}`}>
      <span className="text-[#00ff41]/60 text-[10px] tracking-wider">{label}</span>
      <span className={`border ${colorClass} ${textSize} tracking-widest font-bold shadow-[0_0_2px_currentColor]`}>
        {status}
      </span>
    </div>
  );
};


export const TerminalText: React.FC<{ text: string; speed?: number }> = ({ text, speed = 30 }) => {
  const [displayed, setDisplayed] = React.useState('');

  React.useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className="font-mono">
      {displayed}
      <span className="animate-pulse">_</span>
    </span>
  );
};

export const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 'ready': return 'bg-[#00ff41]';
      case 'resetting': 
      case 'provisioning': return 'bg-yellow-500';
      case 'error': 
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDisplayStatus = () => {
    switch (status) {
      case 'ready': return 'ONLINE';
      case 'expired': return 'EXPIRED';
      case 'error': return 'ERROR';
      case 'provisioning': return 'PROVISIONING';
      case 'resetting': return 'RESETTING';
      case 'pending': return 'PENDING';
      default: return status.toUpperCase();
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'error': 
      case 'expired': return '#ef4444';
      case 'resetting':
      case 'provisioning': return '#eab308';
      default: return '#00ff41';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-widest">
      <div className={`w-2 h-2 rounded-full ${getColor()} animate-pulse shadow-[0_0_5px_currentColor]`} />
      <span style={{ color: getTextColor() }}>
        SYSTEM: {getDisplayStatus()}
      </span>
    </div>
  );
};
