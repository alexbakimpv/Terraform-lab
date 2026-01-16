import React, { useState, useEffect } from 'react';
import { User, LabInfo } from '../types';
import { ApiService } from '../services/api';
import { CyberCard, CyberButton, StatusIndicator, CyberInput, StatusBadge } from './ui/CyberComponents';
import { Copy, ExternalLink, RefreshCcw, Timer, ShieldAlert, Terminal, Shield, RefreshCw, BookOpen, Settings, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  user: User;
  labInfo: LabInfo;
  onRefresh: () => void;
}

const MissionControl: React.FC<Props> = ({ user, labInfo, onRefresh }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [labStatus, setLabStatus] = useState<LabInfo['status']>(labInfo.status);
  const [copied, setCopied] = useState<string | null>(null);

  // Imperva State
  const [cname, setCname] = useState('');
  const [txtRecord, setTxtRecord] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isRefresingImperva, setIsRefreshingImperva] = useState(false);
  const [isImpervaExpanded, setIsImpervaExpanded] = useState(labInfo.imperva.waf === 'OFF');

  // Countdown timer effect
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a9bcae53-107f-4811-adb3-fc2976060c09',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MissionControl.tsx:timerEffect',message:'Timer setup',data:{sessionExpiry: user.sessionExpiry, labId: user.labId, labStatus: labInfo.status, victimUrl: labInfo.victimUrl, clientUrl: labInfo.clientUrl},hypothesisId:'H3B,H4A',timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    const updateTimer = () => {
      const expiry = new Date(user.sessionExpiry).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("SESSION EXPIRED");
        return;
      }

      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    const interval = setInterval(updateTimer, 1000);
    updateTimer(); // Initial call
    return () => clearInterval(interval);
  }, [user.sessionExpiry]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleReset = async () => {
    if (!confirm("WARNING: THIS WILL WIPE ALL DATA ON THE VICTIM MACHINE. CONFIRM RESET?")) return;
    
    setIsResetting(true);
    setLabStatus('resetting');
    try {
      await ApiService.resetLab();
      // In a real app, we might poll for status. Here we pretend it's ready after the call.
      setTimeout(() => {
        setLabStatus('ready');
        setIsResetting(false);
      }, 2000);
    } catch (e) {
      setLabStatus('error');
      setIsResetting(false);
    }
  };

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await ApiService.extendSession();
      onRefresh(); // Refresh parent to get new expiry
    } catch (e) {
      console.error("Failed to extend");
    } finally {
      setIsExtending(false);
    }
  };

  const handleOnboardImperva = async () => {
    if (!cname) {
        alert("CNAME is required.");
        return;
    }
    setIsOnboarding(true);
    try {
        await ApiService.onboardImperva(cname, txtRecord);
        // alert("Imperva provisioning initiated."); // Removed alert for smoother UX
        setIsImpervaExpanded(false); // Auto-minimize
        onRefresh(); // Refresh to check status
    } catch (e) {
        alert("Failed to onboard.");
    } finally {
        setIsOnboarding(false);
    }
  };

  const handleRefreshImperva = async (e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setIsRefreshingImperva(true);
    await onRefresh();
    setTimeout(() => setIsRefreshingImperva(false), 500);
  };

  const handleRunbook = () => {
    if (!labInfo.runbookUrl) return;
    window.open(labInfo.runbookUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto w-full pb-12">
      <div className="mb-8 text-center animate-pulse">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter neon-text mb-2">AMPLIFY LAUNCHPAD</h1>
        <p className="text-xs tracking-[0.3em] text-[#00ff41]/70">LAB ID: {user.labId}</p>
      </div>

      <CyberCard title="Assigned Lab Environment" className="mb-8">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#00ff41]/30 pb-6 mb-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-[#00ff41]/10 border border-[#00ff41] rounded-sm">
                    <ShieldAlert className="w-8 h-8 text-[#00ff41]" />
                </div>
                <div>
                    <h2 className="text-sm text-[#00ff41]/60 uppercase tracking-widest">Assigned Target</h2>
                    <p className="text-xl md:text-2xl font-bold">{labInfo.scenarioName}</p>
                    <p className="text-[10px] tracking-[0.25em] text-[#00ff41]/50 mt-1">SCENARIO_ID: {labInfo.scenarioId}</p>
                </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center gap-4">
                <CyberButton 
                    variant="ghost" 
                    className="border border-[#00ff41]/50 text-xs py-2 w-full md:w-auto"
                    onClick={handleRunbook}
                    disabled={!labInfo.runbookUrl}
                >
                    <BookOpen size={14} /> MISSION RUNBOOK
                </CyberButton>
                <StatusIndicator status={labStatus} />
            </div>
        </div>

        {/* Connection Details */}
        <div className="grid gap-6 mb-8">
            {/* Target Lab URL */}
            <div className="bg-[#001a05] p-4 border-l-4 border-[#00ff41]">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs uppercase tracking-widest text-[#00ff41]/70">Target lab URL</label>
                    {copied === 'victim' && <span className="text-xs text-white bg-[#00ff41]/50 px-1">COPIED</span>}
                </div>
                <div className="flex gap-2 items-center">
                    <code className="flex-1 bg-black p-3 font-mono text-sm border border-[#00ff41]/20 truncate">
                        {labInfo.victimUrl}
                    </code>
                    <CyberButton variant="ghost" onClick={() => handleCopy(labInfo.victimUrl, 'victim')} className="px-3">
                        <Copy size={16} />
                    </CyberButton>
                </div>
            </div>

            {/* Attack Client */}
            <div className="bg-[#001a05] p-4 border-l-4 border-white/50">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs uppercase tracking-widest text-white/70">Attack Client</label>
                    {copied === 'client' && <span className="text-xs text-white bg-white/50 px-1">COPIED</span>}
                </div>
                <div className="flex gap-2 items-center">
                    <code className="flex-1 bg-black p-3 font-mono text-sm border border-white/10 text-white truncate">
                        {labInfo.clientUrl || 'Not available'}
                    </code>
                    <CyberButton variant="ghost" onClick={() => handleCopy(labInfo.clientUrl, 'client')} className="px-3 text-white hover:text-white hover:border-white">
                        <Copy size={16} />
                    </CyberButton>
                    {labInfo.clientUrl && (
                        <a href={labInfo.clientUrl} target="_blank" rel="noreferrer" className="block">
                            <CyberButton variant="ghost" className="px-3 text-white hover:text-white hover:border-white">
                                <ExternalLink size={16} />
                            </CyberButton>
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* Control Panel */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-[#00ff41]/30 gap-4">
            <div className="w-full md:w-auto">
                <CyberButton 
                    variant="danger" 
                    onClick={handleReset} 
                    disabled={isResetting || labStatus === 'resetting'}
                    className="w-full md:w-auto"
                >
                    {isResetting || labStatus === 'resetting' ? (
                        <><RefreshCcw className="animate-spin" size={16} /> SYSTEM REBOOTING...</>
                    ) : (
                        <><Terminal size={16} /> RESET LAB ENVIRONMENT</>
                    )}
                </CyberButton>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-[#001a05] p-2 border border-[#00ff41]/30 rounded">
                <div className="flex items-center gap-2 pl-2">
                    <Timer size={16} className={parseInt(timeLeft.split(':')[0]) === 0 && parseInt(timeLeft.split(':')[1]) < 10 ? "text-red-500 animate-pulse" : "text-[#00ff41]"} />
                    <span className="font-mono text-xl font-bold tracking-widest">{timeLeft}</span>
                </div>
                <CyberButton 
                    variant="primary" 
                    onClick={handleExtend} 
                    disabled={isExtending}
                    className="py-1 px-3 text-xs"
                >
                    {isExtending ? "..." : "+ EXTEND"}
                </CyberButton>
            </div>
        </div>
      </CyberCard>

      {/* Imperva Section */}
      <CyberCard title="Defense Shield // Imperva">
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#001a05] p-4 border border-[#00ff41]/20">
                 <div className="flex items-center gap-3">
                     <Shield className="text-[#00ff41] w-6 h-6" />
                     <div className="text-sm font-bold tracking-widest uppercase">Security Status</div>
                 </div>
                 
                 <div className="flex items-center justify-between gap-4 md:gap-8 w-full md:w-auto">
                     <div className="flex gap-2 md:gap-6">
                        <StatusBadge label="WAF" status={labInfo.imperva.waf} />
                        <StatusBadge label="CERT" status={labInfo.imperva.cert} />
                        <StatusBadge label="DNS" status={labInfo.imperva.dns} />
                     </div>
                     
                     {/* Minimized Controls */}
                     {!isImpervaExpanded && (
                        <div className="flex items-center gap-2 pl-4 border-l border-[#00ff41]/20">
                            <button 
                                onClick={handleRefreshImperva} 
                                className="text-[#00ff41]/50 hover:text-[#00ff41] p-1 transition-colors" 
                                title="Refresh Status"
                            >
                                <RefreshCw size={16} className={isRefresingImperva ? "animate-spin" : ""} />
                            </button>
                            <button 
                                onClick={() => setIsImpervaExpanded(true)} 
                                className="text-[#00ff41]/50 hover:text-[#00ff41] p-1 transition-colors" 
                                title="Configure Settings"
                            >
                                <Settings size={16} />
                            </button>
                        </div>
                     )}
                 </div>
            </div>

            {isImpervaExpanded && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <CyberInput 
                            label="Imperva CNAME" 
                            placeholder="e.g. gv-xxxxxxxx.impervadns.net" 
                            value={cname}
                            onChange={(e) => setCname(e.target.value)}
                        />
                        <CyberInput 
                            label="TXT Validation (Optional)" 
                            placeholder="e.g. imperva-verification=..." 
                            value={txtRecord}
                            onChange={(e) => setTxtRecord(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-between md:justify-end gap-3 pt-2 border-t border-[#00ff41]/20 mt-2">
                        <div className="md:hidden">
                            <CyberButton 
                                variant="ghost" 
                                onClick={() => setIsImpervaExpanded(false)}
                            >
                                <ChevronUp size={16} /> HIDE
                            </CyberButton>
                        </div>
                        <div className="flex gap-3">
                            <CyberButton 
                                variant="ghost" 
                                onClick={handleRefreshImperva}
                                disabled={isRefresingImperva}
                            >
                                <RefreshCw className={isRefresingImperva ? "animate-spin" : ""} size={16} /> REFRESH STATUS
                            </CyberButton>
                            <CyberButton 
                                variant="primary" 
                                onClick={handleOnboardImperva}
                                disabled={isOnboarding}
                            >
                                {isOnboarding ? "PROVISIONING..." : "INITIALIZE ONBOARDING"}
                            </CyberButton>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Show a small expander if hidden, just in case users miss the icon, but keep it subtle. 
                Actually the icon in the header is enough standard UI. 
            */}
        </div>
      </CyberCard>
    </div>
  );
};

export default MissionControl;