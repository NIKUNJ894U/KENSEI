import React, { useState } from 'react';
import { User, ShieldCheck, CalendarRange, Check, Edit2, Loader2, Focus, LogIn, LogOut, Mail, Smile, Volume2, Play, Type } from 'lucide-react';
import { UserProfile } from '../types';
import { ALERT_TONES, playAlertTone } from '../lib/audioHelper';
import { AppLogo } from './AppLogo';

export const AVATARS = [
  { id: 'fox', emoji: '🦊', label: 'Clever Fox', bg: 'bg-gradient-to-br from-orange-400 to-red-500' },
  { id: 'sloth', emoji: '🦥', label: 'Chill Sloth', bg: 'bg-gradient-to-br from-amber-400 to-amber-600' },
  { id: 'lion', emoji: '🦁', label: 'Courageous Lion', bg: 'bg-gradient-to-br from-yellow-400 to-orange-500' },
  { id: 'owl', emoji: '🦉', label: 'Wise Owl', bg: 'bg-gradient-to-br from-indigo-400 to-slate-600' },
  { id: 'unicorn', emoji: '🦄', label: 'Creative Unicorn', bg: 'bg-gradient-to-br from-pink-400 to-purple-500' },
  { id: 'rocket', emoji: '🚀', label: 'Fast Rocket', bg: 'bg-gradient-to-br from-blue-400 to-indigo-600' },
  { id: 'sparkles', emoji: '⚡', label: 'Super Spark', bg: 'bg-gradient-to-br from-amber-300 to-yellow-500' },
  { id: 'zen', emoji: '🧘', label: 'Mindful Zen', bg: 'bg-gradient-to-br from-teal-400 to-emerald-600' },
  { id: 'coffee', emoji: '☕', label: 'Energetic Brew', bg: 'bg-gradient-to-br from-rose-400 to-orange-600' },
  { id: 'target', emoji: '🎯', label: 'Laser Focus', bg: 'bg-gradient-to-br from-rose-500 to-red-600' },
];

interface ProfileSettingsProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  googleUser: any;
  accessToken: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  isLoggingIn: boolean;
}

export function ProfileSettings({ 
  profile, 
  onUpdateProfile, 
  googleUser, 
  accessToken, 
  onLogin, 
  onLogout, 
  isLoggingIn 
}: ProfileSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleFocusMode = async () => {
    const updated = { ...profile, focusMode: !profile.focusMode };
    onUpdateProfile(updated);
    
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusMode: !profile.focusMode })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setIsSaving(true);
    const updated = { ...profile, name: tempName };
    onUpdateProfile(updated);

    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName })
      });
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAvatar = async (avatarId: string | undefined) => {
    const updated = { ...profile, avatar: avatarId };
    onUpdateProfile(updated);

    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarId || null })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAlertTone = async (toneId: string) => {
    // Play a preview of the tone instantly
    playAlertTone(toneId);

    const updated = { ...profile, alertTone: toneId };
    onUpdateProfile(updated);

    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertTone: toneId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleIntegration = async (integrationName: string) => {
    const alreadyEnabled = profile.integrations.includes(integrationName);
    const updatedIntegrations = alreadyEnabled
      ? profile.integrations.filter(i => i !== integrationName)
      : [...profile.integrations, integrationName];

    const updated = { ...profile, integrations: updatedIntegrations };
    onUpdateProfile(updated);

    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrations: updatedIntegrations })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="profile-settings-card" className="p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* User profile & Name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-700 dark:text-zinc-300 overflow-hidden shadow-sm">
            {profile.avatar ? (
              (() => {
                const av = AVATARS.find(a => a.id === profile.avatar);
                return av ? (
                  <div className={`w-full h-full flex items-center justify-center text-2xl ${av.bg}`}>
                    {av.emoji}
                  </div>
                ) : (
                  <div className="bg-black w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </div>
                );
              })()
            ) : googleUser && googleUser.photoURL ? (
              <img src={googleUser.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="bg-black w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 px-2.5 py-1.5 text-sm rounded-lg focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans"
                    maxLength={30}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="p-1 text-emerald-600 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 font-display">
                    {profile.name}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-100 rounded transition-colors cursor-pointer"
                    title="Edit Name"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-mono uppercase text-[9px] text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/40 px-1.5 py-0.5 border border-gray-200 dark:border-zinc-800">Task Companion Active</span>
              {googleUser && (
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
                  {googleUser.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Focus Mode & Integrations */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Focus Mode Toggle */}
          <button
            id="focus-mode-toggle-btn"
            onClick={handleToggleFocusMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all cursor-pointer ${
              profile.focusMode
                ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/30 ring-2 ring-green-500/10'
                : 'bg-gray-50 dark:bg-zinc-850 text-gray-600 dark:text-zinc-350 border-gray-200 dark:border-zinc-750 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Focus className={`w-3.5 h-3.5 ${profile.focusMode ? 'animate-pulse' : ''}`} />
            FOCUS MODE: {profile.focusMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Avatar Picker Section */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
        <h3 className="text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
          <Smile className="w-3.5 h-3.5 text-amber-500" />
          Choose Profile Avatar
        </h3>
        <div className="flex flex-wrap gap-2">
          {/* Revert / Default Option */}
          <button
            onClick={() => handleSelectAvatar(undefined)}
            className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center text-xs font-semibold transition-all relative cursor-pointer ${
              !profile.avatar
                ? 'border-black dark:border-zinc-100 bg-gray-50 dark:bg-zinc-800 ring-2 ring-black/5'
                : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-650 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
            title="Reset to Initials/Google Profile Photo"
          >
            {googleUser && googleUser.photoURL ? (
              <img src={googleUser.photoURL} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-4 h-4 text-gray-500" />
            )}
            {!profile.avatar && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-black dark:bg-zinc-100 rounded-full flex items-center justify-center text-white dark:text-zinc-950 border border-white dark:border-zinc-900">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </button>

          {/* Predefined Fun Avatars */}
          {AVATARS.map((av) => {
            const isSelected = profile.avatar === av.id;
            return (
              <button
                key={av.id}
                onClick={() => handleSelectAvatar(av.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all relative ${av.bg} shadow-xs cursor-pointer hover:scale-105 active:scale-95 ${
                  isSelected ? 'ring-2 ring-black dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900 scale-105' : 'opacity-80 hover:opacity-100'
                }`}
                title={av.label}
              >
                <span>{av.emoji}</span>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-black dark:bg-zinc-100 rounded-full flex items-center justify-center text-white dark:text-zinc-950 border border-white dark:border-zinc-900">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Google Auth Block */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-zinc-950/40 rounded-xl border border-gray-100 dark:border-zinc-800/60 flex flex-col items-stretch gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left w-full sm:w-auto">
            <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${accessToken ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
              Google Services Linkage
            </p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
              {accessToken ? "Synced. Direct Gmail sending and Calendar block writes enabled." : "Authorization required to activate calendar block creation and urgent Gmail briefings."}
            </p>
          </div>
          <div className="w-full sm:w-auto text-right flex justify-end">
            {accessToken ? (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-750 dark:text-red-400 px-3 py-1.5 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-350 hover:bg-gray-50 dark:hover:bg-zinc-750 hover:border-gray-300 dark:hover:border-zinc-650 rounded-lg px-3 py-2 flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                Connect Google
              </button>
            )}
          </div>
        </div>
        {!accessToken && (
          <div className="mt-1 pt-2 border-t border-gray-150 dark:border-zinc-800 text-[10px] text-gray-500 dark:text-zinc-400 flex items-start gap-1.5 leading-relaxed bg-amber-500/5 dark:bg-amber-500/2 px-2.5 py-1.5 rounded-md">
            <span className="text-amber-600 dark:text-amber-500 font-mono text-xs select-none">⚠️</span>
            <span>
              <strong>Privacy Notice:</strong> The Kensei does not record or customize your personal data, drafts, or task details. However, to ensure maximum privacy, it is highly recommended to use a Google email account that does not contain highly sensitive personal information.
            </span>
          </div>
        )}
      </div>

      {/* Readability & Text Size Controls */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
        <h3 className="text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
          <Type className="w-3.5 h-3.5 text-amber-500" />
          App Readability & Font Size
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-zinc-450 mb-3 leading-relaxed">
          Adjust the visual scale of the interface to make reading comfortable. Selecting a larger size dynamically expands all text labels, metrics, and cards.
        </p>
        <div className="grid grid-cols-4 gap-2 bg-gray-50/50 dark:bg-zinc-950/20 p-1.5 border border-gray-150 dark:border-zinc-850 rounded-xl">
          {[
            { id: 'small', label: 'Small', desc: 'Compact view' },
            { id: 'normal', label: 'Default', desc: 'Standard clarity' },
            { id: 'large', label: 'Large', desc: 'Highly readable' },
            { id: 'huge', label: 'Huge', desc: 'Maximum contrast' }
          ].map((size) => {
            const isSelected = profile.fontSize === size.id || (!profile.fontSize && size.id === 'normal');
            return (
              <button
                key={size.id}
                type="button"
                onClick={async () => {
                  const updated = { ...profile, fontSize: size.id as any };
                  onUpdateProfile(updated);
                  try {
                    await fetch('/api/profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ fontSize: size.id })
                    });
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 border transition-all text-center cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 dark:bg-amber-500/5 border-amber-500 text-amber-800 dark:text-amber-400 font-semibold'
                    : 'bg-transparent border-transparent text-gray-500 dark:text-zinc-450 hover:bg-gray-100/40 dark:hover:bg-zinc-800/40'
                } rounded-lg`}
              >
                <span className="text-xs">{size.label}</span>
                <span className="text-[8px] font-mono text-gray-400 dark:text-zinc-500 mt-0.5">{size.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert Tone Picker Section */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
        <h3 className="text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
          <Volume2 className="w-3.5 h-3.5 text-rose-500" />
          1-Hour Alert Warning Tone
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-zinc-450 mb-3 leading-relaxed">
          Choose the Web Audio synthesized alarm played when a high-priority deadline is less than 1 hour away. Click to save and preview.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALERT_TONES.map((tone) => {
            const isSelected = profile.alertTone === tone.id || (!profile.alertTone && tone.id === 'radar');
            return (
              <div
                key={tone.id}
                id={`alert-tone-btn-${tone.id}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectAlertTone(tone.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectAlertTone(tone.id);
                  }
                }}
                className={`flex items-center justify-between p-2.5 border transition-all text-left cursor-pointer group ${
                  isSelected
                    ? 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-500 text-rose-700 dark:text-rose-400'
                    : 'bg-gray-50/40 dark:bg-zinc-950/20 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex-1 pr-2 truncate">
                  <div className="text-xs font-bold uppercase tracking-tight flex items-center gap-1.5">
                    {tone.name}
                    {isSelected && (
                      <span className="text-[8px] font-mono font-black bg-rose-500 text-white px-1 py-0.5 rounded-none scale-90">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-gray-400 dark:text-zinc-500 mt-0.5 truncate leading-tight">
                    {tone.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAlertTone(tone.id);
                  }}
                  className={`p-1.5 border hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'border-rose-400/40 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'border-gray-200 dark:border-zinc-750 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-400'
                  }`}
                  title="Test Sound"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integrations panel */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800/80">
        <h3 className="text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
          <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />
          Active Integrations
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Google Calendar */}
          <div 
            id="integration-google-calendar"
            onClick={() => {
              if (!accessToken) return;
              handleToggleIntegration('Google Calendar');
            }}
            className={`flex flex-col justify-between p-3 rounded-xl border transition-all ${
              !accessToken ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-zinc-950/20 border-gray-200 dark:border-zinc-800 text-gray-400' :
              profile.integrations.includes('Google Calendar')
                ? 'bg-indigo-50/50 dark:bg-indigo-950/15 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-300 shadow-xs cursor-pointer'
                : 'bg-gray-50/40 dark:bg-zinc-950/20 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${accessToken && profile.integrations.includes('Google Calendar') ? 'bg-indigo-500' : 'bg-gray-300'}`} />
              <div className="text-xs font-semibold">Google Calendar Sync</div>
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 self-start">
              {!accessToken ? 'REQUIRES LINK' : profile.integrations.includes('Google Calendar') ? 'CONNECTED' : 'DISABLED'}
            </div>
          </div>

          {/* Gmail Alerts */}
          <div 
            id="integration-gmail-alerts"
            onClick={() => {
              if (!accessToken) return;
              handleToggleIntegration('Gmail Alerts');
            }}
            className={`flex flex-col justify-between p-3 rounded-xl border transition-all ${
              !accessToken ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-zinc-950/20 border-gray-200 dark:border-zinc-800 text-gray-400' :
              profile.integrations.includes('Gmail Alerts')
                ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 shadow-xs cursor-pointer'
                : 'bg-gray-50/40 dark:bg-zinc-950/20 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700 cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${accessToken && profile.integrations.includes('Gmail Alerts') ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <div className="text-xs font-semibold">Gmail Critical Alerts</div>
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 self-start">
              {!accessToken ? 'REQUIRES LINK' : profile.integrations.includes('Gmail Alerts') ? 'CONNECTED' : 'DISABLED'}
            </div>
          </div>

          {/* System Push Notifications */}
          <div 
            id="integration-system-notifications"
            onClick={() => handleToggleIntegration('System Push Notifications')}
            className={`flex flex-col justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
              profile.integrations.includes('System Push Notifications')
                ? 'bg-pink-50/50 dark:bg-pink-950/15 border-pink-200 dark:border-pink-900/40 text-pink-900 dark:text-pink-300 shadow-xs'
                : 'bg-gray-50/40 dark:bg-zinc-950/20 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${profile.integrations.includes('System Push Notifications') ? 'bg-pink-500' : 'bg-gray-300'}`} />
              <div className="text-xs font-semibold">Dynamic Smart Push</div>
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 self-start">
              {profile.integrations.includes('System Push Notifications') ? 'ACTIVE' : 'DISABLED'}
            </div>
          </div>
        </div>
      </div>

      {/* Official Brand Identity Showcase */}
      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-zinc-800/80 flex flex-col items-center">
        <h4 className="text-[11px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3 text-center">
          Official Brand Identity
        </h4>
        <div className="shadow-lg rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300 border border-zinc-900/10 dark:border-zinc-800/50">
          <AppLogo showText={true} />
        </div>
      </div>
    </div>
  );
}

