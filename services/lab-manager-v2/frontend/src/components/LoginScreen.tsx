import React, { useState } from 'react';
import { CyberCard, CyberButton, CyberInput } from './ui/CyberComponents';
import { User, Key, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStage, setAuthStage] = useState<'idle' | 'verifying' | 'success'>('idle');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAuthStage('verifying');

    try {
      await onLogin(email, password);
      setAuthStage('success');
    } catch (err: any) {
      const errorMsg = err?.message ?? 'Login failed. Please check your credentials.';
      setError(errorMsg);
      setAuthStage('idle');
      setLoading(false);
    }
  };

  const handleDemoFill = (role: 'student' | 'admin') => {
    setEmail(role === 'admin' ? 'root@amplifys.us' : 'student@cyber.test');
    setPassword('demo-token');
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-white mb-2 neon-text">PLEASE AUTHENTICATE</h1>
        <p className="text-xs tracking-[0.3em] text-[#00ff41]/50">AMPLIFY LAB GATEWAY</p>
      </div>

      <CyberCard className="shadow-[0_0_50px_rgba(0,255,65,0.1)]">
        {authStage === 'success' ? (
          <div className="py-12 text-center">
            <ShieldCheck className="w-16 h-16 text-[#00ff41] mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-[#00ff41] tracking-widest mb-2">ACCESS GRANTED</h2>
            <p className="text-xs text-white/50 font-mono animate-pulse">Initializing session handshake...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-3 top-3 text-[#00ff41]/50 group-focus-within:text-[#00ff41]" size={18} />
                <CyberInput
                  placeholder="EMAIL"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative group">
                <Key className="absolute left-3 top-3 text-[#00ff41]/50 group-focus-within:text-[#00ff41]" size={18} />
                <CyberInput
                  type="password"
                  placeholder="PASSWORD"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 border border-red-500/50 bg-red-900/10 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}
            
            <div className="pt-2">
              <CyberButton type="submit" className="w-full justify-between group" disabled={loading}>
                {loading ? 'VERIFYING CREDENTIALS...' : 'AUTHENTICATE'}
                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </CyberButton>
            </div>

            <div className="text-center pt-4 border-t border-[#00ff41]/20 flex justify-between items-center">
              <div className="text-[10px] text-[#00ff41]/40 uppercase tracking-widest cursor-pointer hover:text-[#00ff41]">
                Forgot Credentials?
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('student')}
                  className="text-[10px] text-[#00ff41]/30 hover:text-[#00ff41] border border-[#00ff41]/20 px-1"
                >
                  STU
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin')}
                  className="text-[10px] text-[#00ff41]/30 hover:text-[#00ff41] border border-[#00ff41]/20 px-1"
                >
                  ADM
                </button>
              </div>
            </div>
          </form>
        )}
      </CyberCard>

      <div className="mt-8 text-center text-[#00ff41]/30 text-[10px] font-mono uppercase tracking-widest">
        <p>Your information will be logged.</p>
      </div>
    </div>
  );
};

export default LoginScreen;