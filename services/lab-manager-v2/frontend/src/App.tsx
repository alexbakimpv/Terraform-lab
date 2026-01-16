import React, { useEffect, useState } from 'react';
import { User, LabInfo, ApiError } from './types';
import { ApiService } from './services/api';
import MissionControl from './components/MissionControl';
import AdminDashboard from './components/AdminDashboard';
import LoginScreen from './components/LoginScreen';
import { TerminalText, CyberButton } from './components/ui/CyberComponents';
import { AlertTriangle, Power, LogOut, User as UserIcon } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [labInfo, setLabInfo] = useState<LabInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [initLogs, setInitLogs] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await ApiService.getUserMe();
          setIsLoggedIn(true);
          setUser(userData);

          if (userData.role === 'student') {
            try {
              const labData = await ApiService.getLabInfo();
              setLabInfo(labData);
            } catch (labErr: any) {
              console.error("Failed to fetch lab info:", labErr);
              setLabInfo(null);
            }
          } else {
            setLabInfo(null);
          }
        }
      } catch (err: any) {
        console.log("No valid session found");
        localStorage.removeItem('access_token');
        setIsLoggedIn(false);
        setUser(null);
        setLabInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    if (loading && !error) {
      const msgs = [
        "INITIALIZING SYSTEM...",
        "ESTABLISHING SECURE HANDSHAKE...",
        "VERIFYING BIOMETRICS...",
        "FETCHING MISSION DATA...",
        "DECRYPTING PAYLOAD..."
      ];
      let delay = 0;
      setInitLogs([]);
      msgs.forEach((msg) => {
        delay += 300;
        setTimeout(() => {
          setInitLogs(prev => [...prev, msg]);
        }, delay);
      });
    }
  }, [loading, error]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setInitLogs([]);

    try {
      const userData = await ApiService.getUserMe();
      setUser(userData);
      setIsLoggedIn(true);

      if (userData.role === 'student') {
        try {
          const labData = await ApiService.getLabInfo();
          setLabInfo(labData);
        } catch (labErr: any) {
          console.error("Failed to fetch lab info:", labErr);
          setLabInfo(null);
        }
      } else {
        setLabInfo(null);
      }

      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      console.error(err);
      setError({ message: err?.message ?? "CONNECTION LOST / SYSTEM FAILURE", code: 500 });
      setIsLoggedIn(false);
      setUser(null);
      setLabInfo(null);
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await ApiService.login(email, password);
      setIsLoggedIn(true);
      setUser(user);
      setError(null);
      await fetchData();
    } catch (err: any) {
      setIsLoggedIn(false);
      setUser(null);
      setLabInfo(null);
      setError({ message: err?.message ?? "Login failed", code: 401 });
      throw err;
    }
  };

  const handleLogout = async () => {
    await ApiService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setLabInfo(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md border border-[#00ff41] p-8 bg-black relative">
           <div className="absolute top-0 left-0 w-full h-1 bg-[#00ff41] animate-pulse"></div>
           <div className="font-mono text-sm space-y-2">
             {initLogs.map((log, i) => (
               <div key={i} className="text-[#00ff41]">
                 <span className="opacity-50 mr-2">{`>`}</span>
                 <TerminalText text={log} speed={20} />
               </div>
             ))}
             {initLogs.length === 5 && (
               <div className="animate-pulse text-[#00ff41] mt-4">_</div>
             )}
           </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="border border-red-600 p-8 max-w-lg text-center bg-red-900/10 neon-shadow shadow-red-900/50">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-red-600 mb-2 font-mono tracking-widest">CRITICAL FAILURE</h2>
          <p className="text-red-400 font-mono mb-6">{error.message}</p>
          <p className="text-red-400/50 text-xs mb-6 font-mono">ERROR_CODE: 0x{error.code}</p>
          <div className="flex gap-4 justify-center">
            <button 
                onClick={() => handleLogout()}
                className="bg-transparent border border-red-600/50 text-red-600/70 px-4 py-2 hover:bg-red-600 hover:text-black transition-all font-mono uppercase tracking-widest text-xs"
            >
                ABORT
            </button>
            <button 
                onClick={() => fetchData()}
                className="bg-transparent border border-red-600 text-red-600 px-6 py-2 hover:bg-red-600 hover:text-black transition-all font-mono uppercase tracking-widest"
            >
                <span className="flex items-center gap-2"><Power size={16} /> Manual Reboot</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col">
      <header className="fixed top-0 left-0 w-full p-2 bg-[#000] border-b border-[#00ff41]/20 z-40 flex justify-between items-center px-4">
         <div className="flex items-center gap-4">
            <div className="text-[#00ff41] text-xs font-bold tracking-[0.2em]">AMPLIFY SYSTEMS V2.0</div>
         </div>
         
         {isLoggedIn && user && (
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-[#00ff41]/70 text-[10px] tracking-widest border-r border-[#00ff41]/20 pr-4">
                    <UserIcon size={12} />
                    <span>{user.role === 'admin' ? 'ADMIN_ACCESS' : `USER: ${user.labId}`}</span>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-[10px] uppercase border border-[#00ff41]/30 text-[#00ff41]/50 px-3 py-1 hover:bg-[#00ff41]/10 hover:text-[#00ff41] hover:border-[#00ff41] transition-all duration-200"
                >
                    <LogOut size={12} /> LOGOUT
                </button>
            </div>
         )}
      </header>
      
      <main className="flex-grow pt-24 md:pt-16 flex items-center justify-center w-full">
        {!isLoggedIn ? (
            <LoginScreen onLogin={handleLogin} />
        ) : user?.role === 'admin' ? (
            <AdminDashboard />
        ) : user ? (
            labInfo ? (
                <MissionControl user={user} labInfo={labInfo} onRefresh={fetchData} />
            ) : (
                <div className="text-center p-8 border border-[#00ff41]/30">
                    <div className="text-[#00ff41] font-mono text-sm mb-4">LOADING LAB DATA...</div>
                    <div className="text-[#00ff41]/50 text-xs">Initializing your lab environment...</div>
                </div>
            )
        ) : null}
      </main>

      <footer className="text-center py-4 text-[#00ff41]/20 text-[10px] font-mono tracking-widest uppercase">
        Amplify Launchpad // Your information will be logged.
      </footer>
    </div>
  );
}

export default App;
