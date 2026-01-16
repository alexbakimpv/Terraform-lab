import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api';
import { CyberCard, CyberButton, StatusBadge, CyberInput, StatusIndicator } from './ui/CyberComponents';
import { Users, UserPlus, ShieldOff, Database, RefreshCw, Timer, Trash2, Terminal, X, Upload, FileText, Shield, Lock, Clock, User, Key, Eye, EyeOff, Save, Activity, FileSpreadsheet, Search, Info, Download } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'participants' | 'admins' | 'profile' | 'audit'>('participants');
  
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAdminInviteModal, setShowAdminInviteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'participants') {
      loadUsers();
    } else if (activeTab === 'admins') {
      loadAdmins();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    if (users.length === 0) setLoading(true);
    try {
      const data = await ApiService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    if (admins.length === 0) setLoading(true);
    try {
      const data = await ApiService.getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAdmin = () => {
    setShowAdminInviteModal(true);
  };

  const handleRevokeAdmin = async (id: number) => {
    if (!confirm(`WARNING: REVOKE ADMINISTRATIVE ACCESS FOR ID ${id}?`)) return;
    setActionLoading(`revoke-${id}`);
    try {
        await ApiService.revokeAdmin(id);
        loadAdmins();
    } catch (e) {
        alert("REVOKE FAILED");
    } finally {
        setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full relative">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h1 className="text-4xl font-black tracking-tighter text-white mb-2">OVERLORD CONSOLE</h1>
           <p className="text-xs tracking-[0.3em] text-white/50">ADMINISTRATIVE ACCESS GRANTED</p>
        </div>
        
        <div className="flex gap-4">
             {activeTab === 'participants' ? (
                 <CyberButton onClick={() => setShowInviteModal(true)}>
                    <UserPlus size={16} /> INVITE PARTICIPANT
                 </CyberButton>
             ) : activeTab === 'admins' ? (
                 <CyberButton onClick={handleInviteAdmin}>
                    <Shield size={16} /> INVITE ADMIN
                 </CyberButton>
             ) : activeTab === 'audit' ? (
                 <CyberButton onClick={() => {}} disabled>
                    <FileSpreadsheet size={16} /> EXPORT LOGS
                 </CyberButton>
             ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#00ff41]/20 overflow-x-auto pb-1 custom-scrollbar">
          <button 
            onClick={() => setActiveTab('participants')}
            className={`px-6 py-2 text-sm font-bold tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'participants' ? 'bg-[#00ff41] text-black' : 'text-[#00ff41]/50 hover:text-[#00ff41] hover:bg-[#00ff41]/10'}`}
          >
            <Users size={16} /> PARTICIPANTS
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            className={`px-6 py-2 text-sm font-bold tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'admins' ? 'bg-[#00ff41] text-black' : 'text-[#00ff41]/50 hover:text-[#00ff41] hover:bg-[#00ff41]/10'}`}
          >
            <Lock size={16} /> ADMIN MANAGEMENT
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-2 text-sm font-bold tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-[#00ff41] text-black' : 'text-[#00ff41]/50 hover:text-[#00ff41] hover:bg-[#00ff41]/10'}`}
          >
            <Activity size={16} /> SYSTEM AUDIT
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 text-sm font-bold tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-[#00ff41] text-black' : 'text-[#00ff41]/50 hover:text-[#00ff41] hover:bg-[#00ff41]/10'}`}
          >
            <User size={16} /> MY PROFILE
          </button>
      </div>

      {activeTab === 'profile' ? (
          <AdminProfileView />
      ) : activeTab === 'audit' ? (
          <SystemAuditView />
      ) : (
        <CyberCard title={activeTab === 'participants' ? "Active Sessions" : "Administrative Personnel"}>
            {loading ? (
                <div className="p-12 text-center text-[#00ff41] animate-pulse">SCANNING DATABASE...</div>
            ) : activeTab === 'participants' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-[#00ff41] text-[#00ff41]/70 text-xs uppercase tracking-widest">
                                <th className="p-4">ID</th>
                                <th className="p-4">Participant</th>
                                <th className="p-4">Lab ID</th>
                                <th className="p-4">Time Left</th>
                                <th className="p-4">WAF</th>
                                <th className="p-4">CERT</th>
                                <th className="p-4">DNS</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-sm">
                            {users.map((u) => (
                                <UserRow key={u.id} user={u} onRefresh={loadUsers} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-[#00ff41] text-[#00ff41]/70 text-xs uppercase tracking-widest">
                                <th className="p-4">ID</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Last Active</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-sm">
                            {admins.map((admin) => (
                                <tr key={admin.id} className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 transition-colors">
                                    <td className="p-4 text-white/50">#{admin.id}</td>
                                    <td className="p-4 font-bold text-[#00ff41]">{admin.email}</td>
                                    <td className="p-4">{admin.role}</td>
                                    <td className="p-4 opacity-70">{admin.lastActive}</td>
                                    <td className="p-4"><StatusBadge label="" status={admin.status === 'Active' ? 'OK' : 'OFF'} size="sm" /></td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => handleRevokeAdmin(admin.id)}
                                                disabled={!!actionLoading}
                                                className="text-red-500 hover:bg-red-500 hover:text-black p-2 border border-transparent hover:border-red-500 transition-colors"
                                                title="Revoke Admin Access"
                                            >
                                                {actionLoading === `revoke-${admin.id}` ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </CyberCard>
      )}

      {/* Bulk Invite Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <InviteModal onClose={() => setShowInviteModal(false)} onSuccess={loadUsers} />
        </div>
      )}

      {/* Admin Invite Modal Overlay */}
      {showAdminInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <AdminInviteModal onClose={() => setShowAdminInviteModal(false)} onSuccess={loadAdmins} />
        </div>
      )}
    </div>
    );
};

// --- Admin Invite Modal Component ---

const AdminInviteModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'executing' | 'complete'>('idle');
    const [error, setError] = useState<string | null>(null);

    const validateEmail = (email: string): boolean => {
        if (!email || !email.includes('@')) {
            setError('Invalid email address');
            return false;
        }
        if (!email.toLowerCase().endsWith('@imperva.com')) {
            setError('Admin emails must be @imperva.com');
            return false;
        }
        setError(null);
        return true;
    };

    const handleExecute = async () => {
        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(email.trim())) {
            return;
        }

        setStatus('executing');
        setError(null);
        try {
            await ApiService.inviteAdmin(email.trim());
            setStatus('complete');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (e: any) {
            setStatus('idle');
            const errorMsg = e?.message || e?.toString() || 'Failed to send admin invitation';
            setError(errorMsg);
            console.error('Admin invite error:', e);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && status === 'idle') {
            handleExecute();
        }
    };

    return (
        <CyberCard className="w-full max-w-md shadow-[0_0_50px_rgba(0,255,65,0.2)]" title="INVITE ADMIN">
            <button 
                onClick={onClose}
                className="absolute top-2 right-2 text-[#00ff41]/50 hover:text-[#00ff41] transition-colors"
            >
                <X size={20} />
            </button>

            <div className="flex flex-col gap-4">
                <div className="bg-[#001a05] p-4 border border-[#00ff41]/20">
                    <div className="mb-2">
                        <div className="text-xs text-[#00ff41] tracking-widest flex items-center gap-2 mb-2">
                            <Shield size={14} /> ADMIN EMAIL ADDRESS
                        </div>
                        <div className="text-xs text-[#00ff41]/50 mb-3">
                            Admin access requires @imperva.com email domain
                        </div>
                    </div>
                    <CyberInput
                        type="email"
                        placeholder="admin@imperva.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={status === 'executing'}
                        className="w-full"
                    />
                    {error && (
                        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                            <X size={12} /> {error}
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-[#00ff41]/20 flex justify-end gap-3">
                    <CyberButton variant="ghost" onClick={onClose} disabled={status !== 'idle'}>
                        CANCEL
                    </CyberButton>
                    <CyberButton 
                        variant="primary" 
                        onClick={handleExecute} 
                        disabled={!email.trim() || status !== 'idle'}
                        className="min-w-[150px]"
                    >
                        {status === 'executing' ? (
                            <><RefreshCw className="animate-spin" size={16} /> SENDING INVITE...</>
                        ) : status === 'complete' ? (
                            "INVITE SENT"
                        ) : (
                            "SEND INVITE"
                        )}
                    </CyberButton>
                </div>
            </div>
        </CyberCard>
    );
};

// --- System Audit View Component ---

const SystemAuditView: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ADMIN' | 'SYSTEM' | 'PARTICIPANT'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await ApiService.getSystemAuditLogs(
                    filter === 'ALL' ? undefined : filter,
                    searchTerm || undefined
                );
                setLogs(data);
            } catch (e) {
                console.error("Failed to load logs");
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [filter, searchTerm]);

    // Logs are already filtered server-side, but we can do additional client-side filtering if needed
    const filteredLogs = logs;

    return (
        <CyberCard title="CENTRALIZED AUDIT LOGGING">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex bg-black border border-[#00ff41]/30 p-1">
                    {['ALL', 'ADMIN', 'PARTICIPANT', 'SYSTEM'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setFilter(role as any)}
                            className={`px-4 py-1 text-xs font-bold tracking-widest transition-colors ${filter === role ? 'bg-[#00ff41] text-black' : 'text-[#00ff41]/50 hover:text-[#00ff41]'}`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="SEARCH LOGS..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black border border-[#00ff41]/30 p-2 pl-8 text-xs text-[#00ff41] focus:outline-none focus:border-[#00ff41]"
                    />
                    <Search size={14} className="absolute left-2 top-2.5 text-[#00ff41]/50" />
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-[#00ff41] animate-pulse">RETRIEVING ENCRYPTED LOGS...</div>
            ) : (
                <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-black z-10 shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                            <tr className="border-b-2 border-[#00ff41] text-[#00ff41]/70 text-xs uppercase tracking-widest">
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Actor</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Target</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-white/50">
                                        NO LOGS FOUND MATCHING CRITERIA
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                <tr key={log.id || Math.random()} className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 transition-colors">
                                    <td className="p-4 whitespace-nowrap text-white/60">
                                        {log.timestamp ? (
                                            <>
                                                <div className="text-[#00ff41]">{new Date(log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp).toLocaleDateString()}</div>
                                                <div className="text-[10px] opacity-70">{new Date(log.timestamp.seconds ? log.timestamp.seconds * 1000 : log.timestamp).toLocaleTimeString()}</div>
                                            </>
                                        ) : (
                                            <span className="text-white/30">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 border text-[10px] font-bold ${
                                            log.role === 'ADMIN' ? 'border-purple-500 text-purple-500' : 
                                            log.role === 'SYSTEM' ? 'border-cyan-500 text-cyan-500' : 
                                            'border-[#00ff41] text-[#00ff41]'
                                        }`}>
                                            {log.role}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-white/90">{log.actor}</td>
                                    <td className="p-4 text-[#00ff41] tracking-wider">{log.action}</td>
                                    <td className="p-4 text-white/70">{log.target || '-'}</td>
                                    <td className="p-4">
                                        <span className={
                                            log.status?.toUpperCase() === 'SUCCESS' ? 'text-[#00ff41]' : 
                                            log.status?.toUpperCase() === 'WARNING' ? 'text-yellow-500' : 
                                            log.status?.toUpperCase() === 'ERROR' ? 'text-red-500 font-bold' :
                                            'text-white/50'
                                        }>
                                            {log.status?.toUpperCase() || 'UNKNOWN'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-white/50 max-w-xs truncate" title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}>
                                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '-')}
                                    </td>
                                </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="p-8 text-center text-white/30 text-xs tracking-widest uppercase">
                            No logs found matching criteria
                        </div>
                    )}
                </div>
            )}
        </CyberCard>
    );
};

// --- Admin Profile Component ---

const AdminProfileView: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [revealKey, setRevealKey] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await ApiService.getAdminProfile();
                setProfile(data);
            } catch (e) {
                console.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const twoFactor = profile?.twoFactor ?? false;
        await ApiService.updateAdminProfile({ twoFactor });
        setSaving(false);
    };

    if (loading) return <div className="p-12 text-center text-[#00ff41] animate-pulse">DECRYPTING IDENTITY...</div>;
    if (!profile) return <div className="p-12 text-center text-red-500">IDENTITY VERIFICATION FAILED</div>;

    // Ensure all required fields have defaults
    const safeProfile = {
        avatar: profile.avatar || '/placeholder.svg',
        name: profile.display_name || profile.name || profile.email || 'Admin',
        role: profile.role || 'ADMIN',
        id: profile.id || 'N/A',
        lastLogin: profile.lastLogin || new Date().toISOString(),
        twoFactor: profile.twoFactor || false,
        apiKey: profile.apiKey || 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        email: profile.email || '',
        activityLog: Array.isArray(profile.activityLog) ? profile.activityLog : [],
        notes: profile.notes || '',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Identity Card */}
            <div className="lg:col-span-1 space-y-6">
                <CyberCard title="IDENTITY VERIFICATION" className="flex flex-col items-center text-center">
                    <div className="relative mb-6 group cursor-pointer">
                        <div className="w-32 h-32 rounded-full border-2 border-[#00ff41] overflow-hidden p-1 bg-black shadow-[0_0_20px_rgba(0,255,65,0.3)]">
                            <img src={safeProfile.avatar} alt="Avatar" className="w-full h-full rounded-full grayscale group-hover:grayscale-0 transition-all duration-500" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
                            <Upload className="text-[#00ff41]" />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-1">{safeProfile.name}</h2>
                    <div className="text-[#00ff41] text-xs font-mono tracking-widest mb-4">{safeProfile.role}</div>
                    
                    <div className="w-full border-t border-[#00ff41]/20 my-4"></div>
                    
                    <div className="w-full space-y-3 text-left">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/50">OPERATIVE ID</span>
                            <span className="font-mono text-[#00ff41]">{safeProfile.id}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-white/50">CLEARANCE</span>
                            <StatusBadge label="" status="OK" size="sm" />
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-white/50">LAST LOGIN</span>
                            <span className="font-mono text-white/70 text-xs">{new Date(safeProfile.lastLogin).toLocaleString()}</span>
                        </div>
                    </div>
                </CyberCard>

                <CyberCard title="SECURITY SETTINGS">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-white">2-Factor Auth</div>
                                <div className="text-xs text-white/50">Hardware Key / TOTP</div>
                            </div>
                            <button 
                                onClick={() => setProfile({...profile, twoFactor: !safeProfile.twoFactor})}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${safeProfile.twoFactor ? 'bg-[#00ff41]' : 'bg-gray-800'}`}
                            >
                                <div className={`w-4 h-4 bg-black rounded-full transition-transform ${safeProfile.twoFactor ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-[#00ff41]/20">
                             <div>
                                <div className="text-sm font-bold text-white">Password Rotation</div>
                                <div className="text-xs text-white/50">Expires in 14 days</div>
                            </div>
                             <CyberButton variant="ghost" className="px-2 py-1 text-xs">RESET</CyberButton>
                        </div>

                         <div className="pt-4">
                             <CyberButton 
                                variant="primary" 
                                className="w-full justify-center" 
                                onClick={handleSave}
                                disabled={saving}
                             >
                                {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} 
                                SAVE CHANGES
                             </CyberButton>
                         </div>
                    </div>
                </CyberCard>
            </div>

            {/* Right Column: Details & Logs */}
            <div className="lg:col-span-2 space-y-6">
                <CyberCard title="CREDENTIALS & API ACCESS">
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <CyberInput label="Primary Email" value={safeProfile.email} readOnly className="opacity-70 cursor-not-allowed" />
                            <CyberInput label="Display Name" value={safeProfile.name} onChange={(e) => setProfile({...profile, display_name: e.target.value, name: e.target.value})} />
                        </div>

                        <div className="bg-[#001a05] p-4 border border-[#00ff41]/30 relative group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-xs text-[#00ff41] tracking-widest font-bold">
                                    <Key size={12} /> API SECRET KEY
                                </div>
                                <button 
                                    onClick={() => setRevealKey(!revealKey)}
                                    className="text-[#00ff41]/50 hover:text-[#00ff41]"
                                >
                                    {revealKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <div className="font-mono text-sm break-all text-white/80">
                                {revealKey ? safeProfile.apiKey : '•'.repeat(safeProfile.apiKey?.length || 40)}
                            </div>
                            <CyberButton variant="ghost" className="absolute bottom-2 right-2 text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                REGENERATE
                            </CyberButton>
                        </div>
                    </div>
                </CyberCard>

                <CyberCard title="AUDIT LOG" className="h-[300px] flex flex-col">
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-black z-10">
                                <tr className="text-xs text-[#00ff41]/50 border-b border-[#00ff41]/20">
                                    <th className="pb-2 font-normal tracking-widest">TIMESTAMP</th>
                                    <th className="pb-2 font-normal tracking-widest">ACTION</th>
                                    <th className="pb-2 font-normal tracking-widest">DETAILS</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono text-xs">
                                {safeProfile.activityLog.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-white/30 text-xs">
                                            NO ACTIVITY LOGS FOUND
                                        </td>
                                    </tr>
                                ) : (
                                    safeProfile.activityLog.map((log: any, index: number) => (
                                        <tr key={log.id || index} className="border-b border-[#00ff41]/10 group hover:bg-[#00ff41]/5">
                                            <td className="py-3 text-white/50 whitespace-nowrap">
                                                {log.timestamp ? (
                                                    <>
                                                        {new Date(log.timestamp).toLocaleDateString()} 
                                                        <span className="text-[#00ff41]/70"> {new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-white/30">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 font-bold text-[#00ff41]">{log.action || '-'}</td>
                                            <td className="py-3 text-white/80">{typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '-')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CyberCard>
            </div>
        </div>
    );
};

// --- Invite Modal Component ---

const InviteModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'executing' | 'complete'>('idle');
    const [targets, setTargets] = useState<any[]>([]);
    const [showTooltip, setShowTooltip] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-parse input
    useEffect(() => {
        const parsed = parseManifest(input);
        setTargets(parsed);
    }, [input]);

    const parseManifest = (text: string): any[] => {
        if (!text) return [];

        const normalizeBoolean = (v: any): boolean | undefined => {
            if (v === undefined || v === null || v === '') return undefined;
            if (typeof v === 'boolean') return v;
            const s = String(v).trim().toLowerCase();
            if (['y', 'yes', 'true', '1'].includes(s)) return true;
            if (['n', 'no', 'false', '0'].includes(s)) return false;
            return undefined;
        };

        const normalizeDurationMinutes = (v: any): number | undefined => {
            if (v === undefined || v === null || v === '') return undefined;
            if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
            const s = String(v).trim().toLowerCase();
            // Accept: 240, 240m, 4h, 4.5h
            const mMatch = s.match(/^([0-9]+)\s*m$/);
            if (mMatch) return Math.max(0, parseInt(mMatch[1], 10));
            const hMatch = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*h$/);
            if (hMatch) return Math.max(0, Math.floor(parseFloat(hMatch[1]) * 60));
            if (/^[0-9]+$/.test(s)) return Math.max(0, parseInt(s, 10));
            return undefined;
        };

        const normalizeTarget = (raw: any): any | null => {
            if (!raw) return null;
            const email = (raw.email || raw.Email || raw.EMAIL || '').toString().trim();
            if (!email || !email.includes('@')) return null;

            return {
                email,
                name: (raw.name ?? raw.Name ?? '').toString().trim() || undefined,
                imperva_account_id: (raw.imperva_account_id ?? raw.impervaAccountId ?? raw.impervaId ?? raw.impervaID ?? '').toString().trim() || undefined,
                org: (raw.org ?? raw.organization ?? '').toString().trim() || undefined,
                is_sub_account: normalizeBoolean(raw.is_sub_account ?? raw.isSubAccount ?? raw.subAccount ?? raw.SubAccount),
                scenario_id: (raw.scenario_id ?? raw.scenarioId ?? raw.scenario ?? '').toString().trim() || undefined,
                duration_minutes: normalizeDurationMinutes(raw.duration_minutes ?? raw.durationMinutes ?? raw.duration ?? '')
            };
        };

        // 1) JSON parsing
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                return json.map(normalizeTarget).filter(Boolean);
            }
        } catch (e) { /* ignore */ }

        // 2. CSV Parsing
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0) return [];

        // Check for header
        const firstLineLower = lines[0].toLowerCase();
        // Crude check if first line is a header row
        const hasHeader = (firstLineLower.includes('email') || firstLineLower.includes('name')) && (firstLineLower.includes(',') || firstLineLower.includes(';'));
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const results: any[] = [];
        for (const line of dataLines) {
            // Basic CSV split
            const parts = line.split(/[,;]/).map(p => p.trim());
            
            // If just a simple email on a line
            if (parts.length === 1 && parts[0].includes('@')) {
                results.push({ email: parts[0] });
                continue;
            }

            // Map based on schema:
            // Name,Email,ImpervaAccountId,Org,IsSubAccount(YES/NO),ScenarioId,DurationMinutes
            if (parts.length > 1) {
                // If the line has an email, consider it a valid record
                if (line.includes('@')) {
                    const target = normalizeTarget({
                        name: parts[0],
                        email: parts[1],
                        imperva_account_id: parts[2],
                        org: parts[3],
                        is_sub_account: parts[4],
                        scenario_id: parts[5],
                        duration_minutes: parts[6]
                    });
                    if (target) results.push(target);
                }
            }
        }
        return results;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setInput(text);
        };
        reader.readAsText(file);
    };

    const handleExecute = async () => {
        if (targets.length === 0) return;
        setStatus('executing');
        try {
            const result = await ApiService.inviteUsersBulk(targets);
            if (result.success) {
                setStatus('complete');
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1000);
            } else {
                setStatus('idle');
                const errorMsg = result.errors?.length 
                    ? `Failed: ${result.errors.join(', ')}` 
                    : 'Deployment failed. Check console for details.';
                alert(errorMsg);
            }
        } catch (e: any) {
            setStatus('idle');
            const errorMsg = e?.message || e?.toString() || 'Deployment failed. Check console for details.';
            console.error('Invite error:', e);
            alert(`DEPLOYMENT FAILED: ${errorMsg}`);
        }
    };

    const csvTemplate = `Name,Email,ImpervaAccountId,Org,IsSubAccount(YES/NO),ScenarioId,DurationMinutes
John Doe,john@cyber.net,12345,Acme Corp,YES,air,240
Jane Smith,jane@cyber.net,67890,Beta Inc,NO,api,120`;

    const jsonTemplate = `[
  {
    "name": "John Doe",
    "email": "john@cyber.net",
    "imperva_account_id": "12345",
    "org": "Acme Corp",
    "is_sub_account": true,
    "scenario_id": "air",
    "duration_minutes": 240
  }
]`;

    const examplePlaceholder = `PASTE MANIFEST HERE...

[CSV FORMAT EXAMPLE]
${csvTemplate}

[JSON FORMAT EXAMPLE]
${jsonTemplate}`;

    const downloadCSVTemplate = () => {
        const blob = new Blob([csvTemplate], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'participant-invite-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const restoreTemplate = () => {
        setInput(examplePlaceholder);
    };

    return (
        <CyberCard className="w-full max-w-2xl shadow-[0_0_50px_rgba(0,255,65,0.2)]" title="DEPLOY NEW PARTICIPANTS">
            <button 
                onClick={onClose}
                className="absolute top-2 right-2 text-[#00ff41]/50 hover:text-[#00ff41] transition-colors"
            >
                <X size={20} />
            </button>

            <div className="flex flex-col gap-4">
                <div className="bg-[#001a05] p-4 border border-[#00ff41]/20">
                    <div className="flex justify-between items-center mb-2">
                         <div className="text-xs text-[#00ff41] tracking-widest flex items-center gap-2 relative">
                            <Terminal size={14} /> WRITE, PASTE OR UPLOAD
                            <div 
                                className="relative inline-block ml-1"
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                <Info size={12} className="text-[#00ff41]/50 hover:text-[#00ff41] cursor-help" />
                                {showTooltip && (
                                    <div className="absolute left-0 top-6 z-50 w-80 bg-[#001a05] border border-[#00ff41]/50 p-3 text-xs text-[#00ff41] shadow-lg">
                                        <div className="font-bold mb-2">FORMAT GUIDE:</div>
                                        <div className="mb-2"><span className="text-[#00ff41]/70">Required:</span> email</div>
                                        <div className="mb-2"><span className="text-[#00ff41]/70">Optional:</span> name, imperva_account_id, org, is_sub_account, scenario_id, duration_minutes</div>
                                        <div className="mb-2"><span className="text-[#00ff41]/70">Formats:</span> CSV, JSON, TXT</div>
                                        <div className="mb-2"><span className="text-[#00ff41]/70">Defaults:</span> scenario_id="air", duration_minutes=240</div>
                                        <div className="text-[#00ff41]/50 text-[10px] mt-2">You can paste just emails (one per line) or use the full CSV/JSON format</div>
                                    </div>
                                )}
                            </div>
                         </div>
                         <div className="text-xs text-[#00ff41]/50">SUPPORTED: CSV, JSON, TXT</div>
                    </div>
                    <textarea 
                        className="w-full h-64 bg-black border border-[#00ff41]/30 p-3 font-mono text-xs text-[#00ff41] focus:outline-none focus:border-[#00ff41] resize-none placeholder-[#00ff41]/20 custom-scrollbar"
                        placeholder={examplePlaceholder}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={status === 'executing'}
                    />
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json,.txt"
                            onChange={handleFileUpload}
                        />
                        <CyberButton variant="ghost" className="text-xs px-3 py-2" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={14} /> UPLOAD MANIFEST FILE
                        </CyberButton>
                        <CyberButton variant="ghost" className="text-xs px-3 py-2" onClick={downloadCSVTemplate}>
                            <Download size={14} /> DOWNLOAD CSV TEMPLATE
                        </CyberButton>
                        {!input && (
                            <CyberButton variant="ghost" className="text-xs px-3 py-2" onClick={restoreTemplate}>
                                <RefreshCw size={14} /> RESTORE TEMPLATE
                            </CyberButton>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-[#00ff41]/50 tracking-widest uppercase">Targets Detected</div>
                        <div className="text-2xl font-bold text-[#00ff41]">{targets.length}</div>
                    </div>
                </div>

                <div className="pt-4 border-t border-[#00ff41]/20 flex justify-end gap-3">
                    <CyberButton variant="ghost" onClick={onClose} disabled={status !== 'idle'}>
                        CANCEL
                    </CyberButton>
                    <CyberButton 
                        variant="primary" 
                        onClick={handleExecute} 
                        disabled={targets.length === 0 || status !== 'idle'}
                        className="min-w-[150px]"
                    >
                        {status === 'executing' ? (
                            <><RefreshCw className="animate-spin" size={16} /> SENDING INVITES...</>
                        ) : status === 'complete' ? (
                            "INVITES SENT"
                        ) : (
                            `INVITE (${targets.length})`
                        )}
                    </CyberButton>
                </div>
            </div>
        </CyberCard>
    );
};

// --- Existing Row Component ---
const UserRow: React.FC<{ user: any; onRefresh: () => void }> = ({ user, onRefresh }) => {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('...');
    const [isLowTime, setIsLowTime] = useState(false);

    useEffect(() => {
        if (!user.sessionExpiry) return;

        const updateTime = () => {
            const expiry = new Date(user.sessionExpiry).getTime();
            const now = new Date().getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft("EXPIRED");
                setIsLowTime(true);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            // Warn if less than 30 mins
            setIsLowTime(diff < 30 * 60 * 1000);
            
            setTimeLeft(`${h}h ${m.toString().padStart(2, '0')}m`);
        };

        updateTime();
        const timer = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [user.sessionExpiry]);


    const handleAction = async (actionName: string, actionFn: () => Promise<void>, confirmMsg?: string) => {
        if (confirmMsg && !confirm(confirmMsg)) return;
        
        setActionLoading(actionName);
        try {
            await actionFn();
            await onRefresh();
        } catch (e) {
            console.error(e);
            alert(`ACTION FAILED: ${actionName}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReassign = () => {
        const scenarios = ['cloud-waf', 'apt-29', 'intro-linux', 'ad-breach', 'compliance-check'];
        const newScenario = prompt(`Enter new scenario ID:\nAvailable: ${scenarios.join(', ')}`, user.scenario);
        if (newScenario && newScenario !== user.scenario) {
            handleAction('reassign', () => ApiService.adminReassignScenario(user.labId, newScenario));
        }
    };

    return (
        <tr className="border-b border-[#00ff41]/10 hover:bg-[#00ff41]/5 transition-colors group">
            <td className="p-4 text-white/50">{user.id}</td>
            <td className="p-4 font-bold max-w-[150px] truncate" title={user.email}>{user.email}</td>
            <td className="p-4 text-[#00ff41]">{user.labId}</td>
            <td className="p-4">
                <span className={`font-mono font-bold flex items-center gap-1 ${isLowTime ? 'text-red-500 animate-pulse' : 'text-[#00ff41]'}`}>
                    <Clock size={12} /> {timeLeft}
                </span>
            </td>
            <td className="p-4"><StatusBadge label="" status={user.imperva?.waf || 'OFF'} size="sm" /></td>
            <td className="p-4"><StatusBadge label="" status={user.imperva?.cert || 'PENDING'} size="sm" /></td>
            <td className="p-4"><StatusBadge label="" status={user.imperva?.dns || 'PROPAGATING'} size="sm" /></td>
            <td className="p-4">
                <span className={`px-2 py-1 text-[10px] uppercase border ${user.status === 'Active' ? 'border-[#00ff41] text-[#00ff41]' : 'border-yellow-500 text-yellow-500'}`}>
                    {user.status}
                </span>
            </td>
            <td className="p-4 text-right">
                <div className="flex gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                    <ActionButton 
                        icon={<RefreshCw size={14} />} 
                        loading={actionLoading === 'reset'} 
                        onClick={() => handleAction('reset', () => ApiService.adminResetLab(user.labId), `WARNING: Hard Reset Lab ${user.labId}?`)}
                        title="Reset Lab Environment"
                        variant="warning"
                    />
                    <ActionButton 
                        icon={<Timer size={14} />} 
                        loading={actionLoading === 'extend'} 
                        onClick={() => handleAction('extend', () => ApiService.adminExtendSession(user.labId))}
                        title="Extend Session (+4h)"
                        variant="success"
                    />
                    <ActionButton 
                        icon={<Database size={14} />} 
                        loading={actionLoading === 'reassign'} 
                        onClick={handleReassign}
                        title="Reassign Scenario"
                        variant="info"
                    />
                    <div className="w-px h-6 bg-[#00ff41]/20 mx-1"></div>
                    <ActionButton 
                        icon={<ShieldOff size={14} />} 
                        loading={actionLoading === 'revoke'} 
                        onClick={() => handleAction('revoke', () => ApiService.adminRevokeAccess(user.labId), `DANGER: REVOKE ACCESS FOR ${user.email}?`)}
                        title="Revoke Access / Terminate"
                        variant="danger"
                    />
                </div>
            </td>
        </tr>
    );
};

const ActionButton: React.FC<{ 
    icon: React.ReactNode; 
    loading?: boolean; 
    onClick: () => void; 
    title: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
}> = ({ icon, loading, onClick, title, variant }) => {
    const colors = {
        success: 'hover:bg-[#00ff41] hover:text-black border-transparent hover:border-[#00ff41] text-[#00ff41]',
        warning: 'hover:bg-yellow-500 hover:text-black border-transparent hover:border-yellow-500 text-yellow-500',
        danger: 'hover:bg-red-500 hover:text-black border-transparent hover:border-red-500 text-red-500',
        info: 'hover:bg-cyan-500 hover:text-black border-transparent hover:border-cyan-500 text-cyan-500'
    };

    return (
        <button 
            onClick={onClick}
            disabled={loading}
            className={`p-2 border transition-colors duration-200 ${colors[variant]} ${loading ? 'opacity-50 cursor-wait' : ''}`}
            title={title}
        >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : icon}
        </button>
    );
};

export default AdminDashboard;