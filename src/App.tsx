import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, Sparkles, AlertTriangle, Calendar, Flame, Focus, 
  CheckCircle, Plus, Info, LayoutDashboard, BrainCircuit, ShieldAlert, Loader2,
  Search, X, Sun, Moon, Activity, Zap, Tag
} from 'lucide-react';
import { Task, UserProfile } from './types';
import { TaskCard } from './components/TaskCard';
import { ProfileSettings, AVATARS } from './components/ProfileSettings';
import { VoiceIntake } from './components/VoiceIntake';
import { ScheduleGapAnalyzer } from './components/ScheduleGapAnalyzer';
import { TaskTrendsChart } from './components/TaskTrendsChart';
import { TaskHeatmap } from './components/TaskHeatmap';
import { initAuth, googleSignIn, logout } from './lib/firebase';
import { LifesaverChatbot } from './components/LifesaverChatbot';
import { getLocalWallClockTimeDifference, formatLocalWallClockDate } from './lib/timeUtils';
import { AppLogo } from './components/AppLogo';
import { LandingPage } from './components/LandingPage';
import { playAlertTone } from './lib/audioHelper';

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) {
    const absMs = Math.abs(diffMs);
    const hours = Math.floor(absMs / (1000 * 60 * 60));
    const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absMs % (1000 * 60)) / 1000);
    const ms = Math.floor(absMs % 1000);
    return `OVERDUE -${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const ms = Math.floor(diffMs % 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [closestTaskDiffMs, setClosestTaskDiffMs] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // Dynamic Nearest Deadline Ticker (millisecond precision)
  useEffect(() => {
    const updateTicker = () => {
      const pending = tasksRef.current.filter(t => !t.completed);
      if (pending.length === 0) {
        setClosestTaskDiffMs(null);
        return;
      }
      const sorted = [...pending].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const closest = sorted[0];
      const diff = new Date(closest.dueDate).getTime() - Date.now();
      setClosestTaskDiffMs(diff);
    };

    updateTicker();
    const tickerInterval = setInterval(updateTicker, 43);
    return () => clearInterval(tickerInterval);
  }, []);

  // Helper to play a heartbeat "lub-dub" thump
  const playThump = (frequency: number = 70) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First thump (Lub)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Second thump (Dub) - slightly higher frequency, slightly delayed
      setTimeout(() => {
        try {
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
          const ctx2 = audioContextRef.current;
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(frequency * 1.15, ctx2.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.18);
          
          gain2.gain.setValueAtTime(0.35, ctx2.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.18);
          
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.start();
          osc2.stop(ctx2.currentTime + 0.18);
        } catch (innerErr) {
          // ignore
        }
      }, 180);
    } catch (e) {
      console.warn("Web Audio API failed or blocked:", e);
    }
  };

  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const [profile, setProfile] = useState<UserProfile>({
    name: "Guest...",
    accountType: "Premium AI Tier",
    integrations: ["Google Calendar", "System Push Notifications"],
    focusMode: false,
    fontSize: "normal"
  });

  useEffect(() => {
    const sizeMap: { [key: string]: string } = {
      small: '15px',
      normal: '17px',
      large: '19px',
      huge: '21.5px',
    };
    const fontSize = profile.fontSize || 'normal';
    document.documentElement.style.fontSize = sizeMap[fontSize] || '17px';
  }, [profile.fontSize]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Google Authentication State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        if (user.email) {
          localStorage.setItem('google_user_email', user.email);
          document.cookie = "google_user_email=" + encodeURIComponent(user.email) + "; path=/; max-age=31536000; SameSite=Lax";
        }
        setGoogleUser(user);
        setAccessToken(token);
        if (user.displayName) {
          setProfile(p => ({ ...p, name: user.displayName || p.name }));
        }
      },
      () => {
        localStorage.removeItem('google_user_email');
        document.cookie = "google_user_email=; path=/; max-age=0; SameSite=Lax";
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        if (res.user.email) {
          localStorage.setItem('google_user_email', res.user.email);
          document.cookie = "google_user_email=" + encodeURIComponent(res.user.email) + "; path=/; max-age=31536000; SameSite=Lax";
        }
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        if (res.user.displayName) {
          setProfile(p => ({ ...p, name: res.user.displayName || p.name }));
        }
        
        setToast({
          message: "🔄 Signed in with Google! Your custom task stack and configurations have been securely synchronized.",
          type: "success"
        });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('google_user_email');
      document.cookie = "google_user_email=; path=/; max-age=0; SameSite=Lax";
      await logout();
      setGoogleUser(null);
      setAccessToken(null);
      setToast({
        message: "👋 Signed out successfully. Switched back to guest space.",
        type: "info"
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Manual task adding state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualCategory, setManualCategory] = useState('Work');
  const [manualCriticality, setManualCriticality] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [manualHoursOffset, setManualHoursOffset] = useState(12);

  // Search filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [triggerCheck, setTriggerCheck] = useState(0);

  // Tag filter & creation state
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [selectedFormTags, setSelectedFormTags] = useState<string[]>([]);

  // System toast alerts for background notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'alert' } | null>(null);

  // Focus breathing animation state
  const [breathingText, setBreathingText] = useState('Inhale...');

  // Track task states securely to avoid dependency loop issues in the background alert checker
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Keep track of task IDs we have already initiated alerts for in the current session
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Automatic 1-hour warning email alert worker
  useEffect(() => {
    if (!profile) return;

    const checkAndSendAlerts = async () => {
      const currentTasks = tasksRef.current;

      // Find any task that is:
      // 1. Incompleted
      // 2. Has not had a 1-hour alert sent yet (in current session and not flagged in DB)
      // 3. Has a valid due date that is due in 1 hour or less (diffMs <= 1 hour)
      // 4. Is not an ancient task (due time is within the last 24 hours)
      const tasksToAlert = currentTasks.filter(t => {
        if (t.completed || t.alertSent1h || alertedIdsRef.current.has(t.id)) {
          return false;
        }
        // Use consistent local wall-clock difference helper to match user experience and prevent UTC mismatching
        const diffMs = getLocalWallClockTimeDifference(t.dueDate);
        return diffMs <= 60 * 60 * 1000 && diffMs > -24 * 60 * 60 * 1000;
      });

      for (const t of tasksToAlert) {
        // Optimistically add to alerted set to prevent duplicate sends/runs
        alertedIdsRef.current.add(t.id);

        const selectedTone = profile.alertTone || 'radar';

        if (accessToken && googleUser) {
          try {
            const formattedDueDate = formatLocalWallClockDate(t.dueDate);
            const formattedCreatedAtDate = formatLocalWallClockDate(t.createdAt);

            // Prepare the automatic quick draft text
            const draftBody = t.draft || `Hi Team,\n\nI am currently working on the task: "${t.title}". Just wanted to update you that this is in progress and my scheduled completion is ${formattedDueDate}. I'm on track with the immediate next step: "${t.immediateNextStep}".\n\nBest regards,\n${profile.name || (googleUser && googleUser.displayName) || 'Guest'}`;
            const draftSubject = `Regarding: ${t.title}`;

            // Quick action draft options: standard mailto links & Gmail web compose links
            const mailtoUrl = `mailto:?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;
            const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`;

            // Construct a highly polished warning HTML email
            const emailSubject = `🚨 [URGENT 1-HOUR WARNING] Kensei Action Alert: ${t.title}`;
            const emailHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #1d1d1f;">
                <div style="background-color: #dc2626; color: #ffffff; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em; text-transform: uppercase;">Kensei AI</h1>
                  <p style="margin: 4px 0 0; font-size: 11px; font-family: monospace; color: #fecaca; letter-spacing: 0.05em;">🚨 1-HOUR CRITICAL DEADLINE WARNING</p>
                </div>
                
                <div style="margin-bottom: 24px;">
                  <div style="display: inline-block; font-size: 10px; font-family: monospace; font-weight: 700; background-color: #fef2f2; color: #b91c1c; padding: 4px 10px; border-radius: 9999px; border: 1px solid #fee2e2; text-transform: uppercase; margin-bottom: 12px;">Urgency Score: ${t.urgencyScore.toFixed(1)}/10.0</div>
                  <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">${t.title}</h2>
                  <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">${t.description || 'No description provided.'}</p>
                </div>

                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 14px 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; line-height: 1.5; color: #374151;">
                  <p style="margin: 0; font-size: 11px; font-family: monospace; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">⏳ DEADLINE CONTROL METRICS</p>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Due Date & Time (Deadline):</td>
                      <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #dc2626;">${formattedDueDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Date Committed (Created):</td>
                      <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #111827;">${formattedCreatedAtDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Task Category:</td>
                      <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #111827;">${t.category}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; font-weight: 500;">Criticality Level:</td>
                      <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #b91c1c; text-transform: uppercase;">${t.criticality}</td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; padding: 14px 16px; border-radius: 12px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 11px; font-family: monospace; font-weight: bold; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">🔮 Immediate Next Physical Step</p>
                  <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 600; color: #065f46; line-height: 1.4;">${t.immediateNextStep}</p>
                </div>

                <!-- Quick Draft and Communication Block -->
                <div style="background-color: #fafafa; border: 1px solid #f3f4f6; padding: 18px; border-radius: 12px; margin-bottom: 24px; text-align: left;">
                  <h3 style="font-size: 12px; font-family: monospace; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px 0;">✍️ AI Prepared Quick Draft</h3>
                  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; font-size: 13px; color: #4b5563; font-family: monospace; white-space: pre-wrap; margin-bottom: 16px; line-height: 1.5;">${draftBody}</div>
                  
                  <p style="font-size: 12px; color: #6b7280; margin: 0 0 12px 0;">Click one of the direct action shortcuts below to instantly draft or send an email regarding this task:</p>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <a href="${mailtoUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;">Draft with Mail App</a>
                    <a href="${gmailWebUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #ea4335; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;">Draft on Gmail Web</a>
                  </div>
                </div>

                <div style="font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px; line-height: 1.4;">
                  This is an automatic high-priority email alert from your Kensei Companion because this task is due in less than 1 hour. Keep executing!
                </div>
              </div>
            `;

            // Construct RFC 2822 email format
            const rfcMessage = [
              `To: ${googleUser.email}`,
              `Subject: ${emailSubject}`,
              'Content-Type: text/html; charset=utf-8',
              'MIME-Version: 1.0',
              '',
              emailHtml
            ].join('\r\n');

            const base64UrlEncoded = btoa(unescape(encodeURIComponent(rfcMessage)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            // Trigger Send API
            const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ raw: base64UrlEncoded })
            });

            if (!gmailRes.ok) {
              let errorText = '';
              try {
                errorText = await gmailRes.text();
              } catch (_) {}
              throw new Error(`Gmail API response error: ${gmailRes.status} ${gmailRes.statusText} - ${errorText}`);
            }

            // Play synthesized Web-Audio warning sound
            playAlertTone(selectedTone);

            // Persist the updated alert status on the backend
            const updatedWithAlert = { ...t, alertSent1h: true };
            await fetch(`/api/tasks/${t.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedWithAlert)
            });

            // Sync local client state
            setTasks(prev => prev.map(item => item.id === t.id ? updatedWithAlert : item));

            // Set visual toast notification in application
            setToast({
              message: `🚨 Auto 1-Hour Warning Gmail Alert successfully sent for "${t.title}"! Check your inbox.`,
              type: 'alert'
            });

            // Auto-hide toast after 8 seconds
            setTimeout(() => setToast(null), 8000);

          } catch (err: any) {
            console.warn(`[Auto-Alert Service] Failed to send auto-alert for task ${t.id} ("${t.title}"). This is often due to mock auth tokens or disabled APIs in sandbox test environments. Marking as attempted to prevent infinite retries. Details:`, err.message || err);
            
            // Force-mark alertSent1h as true to avoid infinite retry/failure cycles every 15 seconds
            try {
              // Play synthesized Web-Audio warning sound anyway as local fallback
              playAlertTone(selectedTone);

              const updatedWithAlert = { ...t, alertSent1h: true };
              await fetch(`/api/tasks/${t.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedWithAlert)
              });
              setTasks(prev => prev.map(item => item.id === t.id ? updatedWithAlert : item));
            } catch (backendErr) {
              console.warn(`[Auto-Alert Service] Failed to persist fallback alert status for task ${t.id}:`, backendErr);
            }
          }
        } else {
          // Play synthesized Web-Audio warning sound for local user
          try {
            playAlertTone(selectedTone);

            const updatedWithAlert = { ...t, alertSent1h: true };
            await fetch(`/api/tasks/${t.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedWithAlert)
            });

            // Sync local client state
            setTasks(prev => prev.map(item => item.id === t.id ? updatedWithAlert : item));

            // Set visual toast notification in application
            setToast({
              message: `🚨 1-Hour Critical Warning: "${t.title}" is due soon! (Next Step: ${t.immediateNextStep})`,
              type: 'alert'
            });

            // Auto-hide toast after 8 seconds
            setTimeout(() => setToast(null), 8000);
          } catch (localErr) {
            console.warn(`[Auto-Alert Service] Failed to execute local alert fallback for task ${t.id}:`, localErr);
          }
        }
      }
    };

    // Run first check immediately, and then poll every 15 seconds
    checkAndSendAlerts();
    const intervalId = setInterval(checkAndSendAlerts, 15000);

    return () => clearInterval(intervalId);
  }, [accessToken, googleUser, profile, triggerCheck]);

  // Fetch initial tasks and profile
  useEffect(() => {
    async function loadData() {
      try {
        const tasksRes = await fetch('/api/tasks');
        const profileRes = await fetch('/api/profile');
        if (tasksRes.ok && profileRes.ok) {
          const tasksData = await tasksRes.json();
          let profileData = await profileRes.json();
          
          // Update profile name if logged in via Google and name is default
          if (googleUser && googleUser.displayName && (!profileData.name || profileData.name === "Guest" || profileData.name === "Guest User")) {
             profileData = { ...profileData, name: googleUser.displayName };
             // Save back to DB
             await fetch('/api/profile', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ name: googleUser.displayName })
             }).catch(e => console.error("Failed to update profile name:", e));
          }
          
          if (!profileData.customTags || profileData.customTags.length === 0) {
            const defaultTags = [
              { id: 'tag-work', name: 'Work', color: '#3B82F6' },
              { id: 'tag-urgent', name: 'Urgent', color: '#EF4444' },
              { id: 'tag-learning', name: 'Learning', color: '#10B981' },
              { id: 'tag-personal', name: 'Personal', color: '#F59E0B' }
            ];
            profileData = { ...profileData, customTags: defaultTags };
            // Save back to DB
            await fetch('/api/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customTags: defaultTags })
            }).catch(e => console.error("Failed to seed default tags:", e));
          }
          
          setTasks(tasksData);
          setProfile(profileData);
        }
      } catch (err) {
        console.error("Failed to load initial data from fullstack API:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [googleUser]);

  // Sync Breathing cycles for Focus Mode
  useEffect(() => {
    if (!profile.focusMode) return;
    
    const cycle = setInterval(() => {
      setBreathingText(prev => {
        if (prev === 'Inhale...') return 'Hold...';
        if (prev === 'Hold...') return 'Exhale...';
        return 'Inhale...';
      });
    }, 4000);

    return () => clearInterval(cycle);
  }, [profile.focusMode]);

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTasksAdded = (newTasks: Task[]) => {
    setTasks(prev => [...newTasks, ...prev]);
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  // Add a task manually
  const handleAddManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    // Estimate urgency score based on offset & criticality
    let urgencyScore = 5.0;
    if (manualCriticality === 'critical') urgencyScore += 3.0;
    else if (manualCriticality === 'high') urgencyScore += 1.5;
    else if (manualCriticality === 'low') urgencyScore -= 2.0;

    // Closer deadline increases score
    if (manualHoursOffset < 3) urgencyScore += 2.0;
    else if (manualHoursOffset < 12) urgencyScore += 1.0;

    urgencyScore = Math.min(Math.max(urgencyScore, 1.0), 10.0);

    const dueDate = new Date(Date.now() + manualHoursOffset * 60 * 60 * 1000).toISOString();

    const taskPayload = {
      title: manualTitle,
      description: manualDesc,
      urgencyScore,
      dueDate,
      category: manualCategory,
      criticality: manualCriticality,
      estimatedEffort: manualHoursOffset >= 5 ? '2 hours' : '45 mins',
      immediateNextStep: 'Click AI Break Down below to organize steps.',
      tags: selectedFormTags
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload)
      });
      if (res.ok) {
        const addedTask = await res.json();
        setTasks(prev => [addedTask, ...prev]);
        setManualTitle('');
        setManualDesc('');
        setManualCategory('Work');
        setManualCriticality('medium');
        setManualHoursOffset(12);
        setSelectedFormTags([]);
        setShowManualForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick statistics
  const activeTasks = tasks.filter(t => !t.completed);
  const criticalTasksCount = activeTasks.filter(t => t.urgencyScore >= 7.5).length;
  const completedTodayCount = tasks.filter(t => t.completed).length;

  const pendingTasks = tasks.filter(t => !t.completed);
  const nearestTask = pendingTasks.length > 0 
    ? [...pendingTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
    : null;

  // Stress / Velocity metrics calculation
  const pendingCount = activeTasks.length;
  const highUrgencyCount = activeTasks.filter(t => t.urgencyScore >= 7.5 || t.criticality === 'critical' || t.criticality === 'high').length;
  const overdueCount = activeTasks.filter(t => new Date(t.dueDate).getTime() < Date.now()).length;

  const baseStress = pendingCount * 6; // max 36
  const urgencyBonus = highUrgencyCount * 14; // max 56
  const overdueBonus = overdueCount * 25; // max 50

  const stressIndex = Math.min(Math.max(baseStress + urgencyBonus + overdueBonus, 10), 100);

  let stressStatus = 'STABLE';
  if (stressIndex >= 70 || overdueCount > 0) {
    stressStatus = 'IMMINENT COLLAPSE';
  } else if (stressIndex >= 35) {
    stressStatus = 'WARNING';
  }

  // Calculate final 60-minute danger zone tasks for the real-time panic gauge
  const uncompletedTasksForPanic = tasks.filter(t => !t.completed);
  const overdueTasksForPanic = uncompletedTasksForPanic.filter(t => {
    const diff = getLocalWallClockTimeDifference(t.dueDate);
    return diff < 0 && diff > -24 * 60 * 60 * 1000; // Overdue but within 24 hours
  });
  
  const dangerZoneTasks = uncompletedTasksForPanic.filter(t => {
    const diff = getLocalWallClockTimeDifference(t.dueDate);
    return diff >= 0 && diff <= 60 * 60 * 1000; // Due in next 60 minutes
  });

  // Calculate 10-minute bins: 0-10m, 10-20m, 20-30m, 30-40m, 40-50m, 50-60m
  const bins = [
    { label: "0-10m", min: 0, max: 10 * 60 * 1000, tasks: [] as Task[] },
    { label: "10-20m", min: 10 * 60 * 1000, max: 20 * 60 * 1000, tasks: [] as Task[] },
    { label: "20-30m", min: 20 * 60 * 1000, max: 30 * 60 * 1000, tasks: [] as Task[] },
    { label: "30-40m", min: 30 * 60 * 1000, max: 40 * 60 * 1000, tasks: [] as Task[] },
    { label: "40-50m", min: 40 * 60 * 1000, max: 50 * 60 * 1000, tasks: [] as Task[] },
    { label: "50-60m", min: 50 * 60 * 1000, max: 60 * 60 * 1000, tasks: [] as Task[] },
  ];

  uncompletedTasksForPanic.forEach(t => {
    const diff = getLocalWallClockTimeDifference(t.dueDate);
    if (diff >= 0 && diff <= 60 * 60 * 1000) {
      const binIndex = Math.min(Math.floor(diff / (10 * 60 * 1000)), 5);
      if (binIndex >= 0 && binIndex < 6) {
        bins[binIndex].tasks.push(t);
      }
    }
  });

  // Filter tasks based on Focus Mode, Panic Mode, and search term
  // Panic Mode isolates ONLY uncompleted High/Critical tasks (score >= 7.5 or criticality in high/critical)
  // Focus Mode isolates ONLY uncompleted tasks with High/Critical urgency scores (score >= 7.0)
  const baseVisibleTasks = profile.focusMode
      ? activeTasks.filter(t => t.urgencyScore >= 7.0).sort((a, b) => b.urgencyScore - a.urgencyScore)
      : [...tasks].sort((a, b) => b.urgencyScore - a.urgencyScore);

  const visibleTasks = baseVisibleTasks.filter(t => {
    // Custom label / tag filter
    if (selectedTagId && (!t.tags || !t.tags.includes(selectedTagId))) {
      return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.category && t.category.toLowerCase().includes(term))
    );
  });

  const handleEnterApp = () => {
    if (profile.focusMode) {
      setProfile(p => ({ ...p, focusMode: false }));
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusMode: false })
      }).catch(err => console.error("Failed to reset focusMode in DB:", err));
    }
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onEnterApp={handleEnterApp} />;
  }

  return (
    <div className='min-h-screen flex flex-col font-sans select-none antialiased relative transition-all duration-500 bg-[#F4F4F5] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAFA]'>
      {/* Brutalist Noise Texture Overlay */}
      <div className="noise-texture"></div>

      {/* Top Banner & Header */}
      <header className="border-b border-zinc-800 bg-[#0A0A0A] sticky top-0 z-30 px-4 h-12 flex items-center">
        <div className="max-w-[95vw] mx-auto flex items-center justify-between gap-4 w-full">
          
          <div className="flex items-center gap-3">
            <AppLogo className="w-8 h-8" />
            <span className="font-sans font-bold text-3xl text-white tracking-[0.2em] flex items-center gap-3">
              <span>K</span>
              <span>E</span>
              <span>N</span>
              <span>S</span>
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="w-3 h-0.5 bg-[#DFE104]"></div>
                <div className="w-3 h-0.5 bg-[#DFE104]"></div>
                <div className="w-3 h-0.5 bg-[#DFE104]"></div>
              </div>
              <span>E</span>
              <span>I</span>
            </span>
          </div>

          {/* Quick status bar */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-tight text-zinc-400">
              <Flame className="w-4 h-4 text-[#C8E500] fill-[#C8E500] dark:fill-none" />
              <span>STREAK: <strong className="text-white font-black">5 Days Saved</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-tight text-zinc-400">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>COMPLETED TODAY: <strong className="text-white font-black">{completedTodayCount} Tasks</strong></span>
            </div>
          </div>

          {/* User profile identifier & Toggle */}
          <div className="flex items-center gap-3">
            {profile.focusMode && (
              <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 border border-emerald-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Focus Active</span>
              </div>
            )}

            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer focus:outline-none flex items-center justify-center rounded-lg"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500 hover:rotate-45 transition-transform duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400 hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            <div className="relative">
              <button
                id="header-profile-menu-trigger"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 border-l border-zinc-800 pl-4 focus:outline-none cursor-pointer text-left hover:opacity-85 transition-opacity"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black uppercase tracking-tight text-zinc-100 leading-none">{profile.name}</p>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mt-1">Companion Active</p>
                </div>
                <div className="w-9 h-9 rounded-none border-2 border-[#18181B] dark:border-[#3F3F46] flex items-center justify-center overflow-hidden relative">
                  {profile.avatar ? (
                    (() => {
                      const av = AVATARS.find(a => a.id === profile.avatar);
                      return av ? (
                        <div className={`w-full h-full flex items-center justify-center text-lg rounded-none ${av.bg}`}>
                          {av.emoji}
                        </div>
                      ) : (
                        <div className="bg-black w-full h-full flex items-center justify-center text-white font-bold text-xs">
                          {profile.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      );
                    })()
                  ) : googleUser && googleUser.photoURL ? (
                    <img src={googleUser.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="bg-black w-full h-full flex items-center justify-center text-white font-bold text-xs">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    {/* Click outside backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    
                    {/* Dropdown panel */}
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-[450px] max-h-[85vh] overflow-y-auto z-50 rounded-none shadow-2xl bg-white dark:bg-zinc-950 border-2 border-black dark:border-[#3F3F46]"
                    >
                      <ProfileSettings 
                        profile={profile} 
                        onUpdateProfile={handleUpdateProfile} 
                        googleUser={googleUser}
                        accessToken={accessToken}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                        isLoggingIn={isLoggingIn}
                      />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* Real-Time Expandable Panic-Gauge and Heat Intensity Map */}
        {/* Placeholder removed panic gauge */}
      </header>

      {/* Kinetic Stats Ticker Marquee */}
      <div className="w-full bg-[#DFE104] text-black border-b-2 border-[#18181B] dark:border-zinc-800 py-3 overflow-hidden select-none font-display font-black text-xs md:text-sm tracking-widest uppercase flex items-center">
        <div className="animate-marquee whitespace-nowrap flex gap-12 shrink-0">
          <span>● STREAK: 5 DAYS SAVED</span>
          <span>● TASK COMPANION ACTIVE</span>
          <span><span>● CRITICAL TASKS: {criticalTasksCount}</span></span>
          <span>● ACTIVE INTERVENTION WARNINGS EMITTED</span>
          <span>● INGEST CHAOTIC AUDIO BRAIN-DUMPS</span>
          <span>● RESCHEDULE SLOTS REALTIME</span>
          <span>● THE LAST-MINUTE COMPANION</span>
        </div>
        <div className="animate-marquee whitespace-nowrap flex gap-12 shrink-0" aria-hidden="true">
          <span>● STREAK: 5 DAYS SAVED</span>
          <span>● TASK COMPANION ACTIVE</span>
          <span><span>● CRITICAL TASKS: {criticalTasksCount}</span></span>
          <span>● ACTIVE INTERVENTION WARNINGS EMITTED</span>
          <span>● INGEST CHAOTIC AUDIO BRAIN-DUMPS</span>
          <span>● RESCHEDULE SLOTS REALTIME</span>
          <span>● THE LAST-MINUTE COMPANION</span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
            <p className="mt-3 text-sm font-mono uppercase tracking-widest">Loading Kensei Intelligence...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TACTICAL HACKATHON COMMAND CENTER */}
            <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 border-4 p-4 transition-all duration-300 rounded-none border-[#18181B] dark:border-[#3F3F46] bg-white dark:bg-zinc-900 shadow-sm'>
              
              {/* PANEL 1 removed */}
              
              {/* PANEL 2: DYNAMIC COUNTDOWN MARQUEE */}
              <div className="lg:col-span-5 flex flex-col justify-between p-3 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-none min-h-[140px] relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold">NEXT EXTINCTION EVENT</span>
                  <span className="text-[10px] font-mono bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 font-bold">
                    MILLI-PRECISION
                  </span>
                </div>

                <div className="my-2 z-10">
                  {nearestTask ? (
                    <>
                      <div className="truncate text-xs font-mono font-bold uppercase tracking-tight text-gray-400 dark:text-zinc-400">
                        {nearestTask.title}
                      </div>
                      <div className={`text-3xl font-mono font-black tracking-tighter tabular-nums mt-1 ${
                        (closestTaskDiffMs && closestTaskDiffMs < 1000 * 60 * 60) ? 'text-red-500' : 'text-black dark:text-white'
                      }`}>
                        {closestTaskDiffMs !== null ? formatCountdown(closestTaskDiffMs) : "00:00:00.000"}
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center text-xs font-mono uppercase text-gray-400 dark:text-zinc-500">
                      No outstanding deadlines. Horizon is clear.
                    </div>
                  )}
                </div>

                <div className="text-[9px] font-mono text-gray-400 dark:text-zinc-550 flex items-center justify-between border-t border-dashed border-gray-200 dark:border-zinc-800 pt-2 z-10">
                  <span>URGENCY SCORE: {nearestTask ? nearestTask.urgencyScore.toFixed(1) : "0.0"}/10.0</span>
                  <span>TIME REMAINING</span>
                </div>
              </div>

              {/* PANEL 3: PROJECTED COLLAPSE STRESS GAUGE */}
              <div className="lg:col-span-4 flex flex-col justify-between p-3 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-none min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold">VELOCITY METER</span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase border ${
                    stressStatus === 'IMMINENT COLLAPSE' 
                      ? 'border-red-500 bg-red-950/30 text-red-500' 
                      : stressStatus === 'WARNING' 
                        ? 'border-yellow-500 bg-yellow-950/30 text-yellow-500' 
                        : 'border-green-500 bg-green-950/30 text-green-500'
                  }`}>
                    {stressStatus}
                  </span>
                </div>

                {/* Segmented Stress Meter LEDs */}
                <div className="my-2">
                  <div className="grid grid-cols-10 gap-1">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const isActive = (i * 10) < stressIndex;
                      let ledColor = 'bg-gray-100 dark:bg-zinc-800';
                      if (isActive) {
                        if (stressStatus === 'IMMINENT COLLAPSE') ledColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse';
                        else if (stressStatus === 'WARNING') ledColor = 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]';
                        else ledColor = 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]';
                      }
                      return <div key={i} className={`h-4 border border-black dark:border-zinc-700 rounded-none ${ledColor}`} />;
                    })}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-400 dark:text-zinc-550 mt-1">
                    <span>0% COLD</span>
                    <span>50% LOAD</span>
                    <span>100% MAXIMUM STRESS</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono border-t border-dashed border-gray-200 dark:border-zinc-800 pt-2 truncate text-gray-500 dark:text-zinc-400">
                  {stressStatus === 'IMMINENT COLLAPSE' ? (
                    <span className="text-red-500 font-bold animate-pulse">⚠️ IMMINENT COLLAPSE PROBABILITY: 94.2%</span>
                  ) : stressStatus === 'WARNING' ? (
                    <span className="text-yellow-500">⚠️ TASK DENSITY RISING. EXCEEDING NOMINAL VELOCITY.</span>
                  ) : (
                    <span className="text-green-500 font-bold">✓ SYSTEM OPERATING WITHIN NOMINAL BOUNDS.</span>
                  )}
                </div>
              </div>

            </div>
            
            {/* Focus Mode Workspace Panel */}
            <AnimatePresence>
              {profile.focusMode && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-900/40 rounded-2xl p-6 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <Focus className="w-16 h-16 text-green-500/5 rotate-12" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Breathing circle visualizer */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center text-center">
                      <motion.div 
                        animate={{ scale: breathingText === 'Inhale...' ? [1, 1.25, 1] : 1 }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-28 h-28 rounded-full bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900/50 flex items-center justify-center"
                      >
                        <div className="text-center">
                          <p className="text-xs font-mono font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">
                            {breathingText}
                          </p>
                          <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-0.5">Calm Mind</p>
                        </div>
                      </motion.div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-4 max-w-[200px] leading-relaxed">
                        Take slow, deliberate deep breaths. Your dashboard is filtered for maximum execution.
                      </p>
                    </div>

                    {/* Information block */}
                    <div className="md:col-span-8 space-y-3">
                      <div className="flex items-center gap-2">
                        <Focus className="w-5 h-5 text-green-600 animate-pulse" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50 font-display">
                          Hyper-Focused Workspace
                        </h2>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                        Focus Mode restricts distraction and shows <strong className="text-green-600 dark:text-green-400 font-semibold">{criticalTasksCount} high-urgency tasks</strong> requiring immediate intervention. Work through the steps deconstructed for each task.
                      </p>
                      
                      <div className="flex items-center gap-2.5">
                        <button
                          id="deactivate-focus-btn"
                          onClick={() => setProfile(p => ({ ...p, focusMode: false }))}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40 transition-colors"
                        >
                          Deactivate Focus Mode
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Intake Section */}
            {!profile.focusMode && (
              <VoiceIntake onTasksAdded={handleTasksAdded} />
            )}

            {/* Schedule block (Hidden or collapsed in Focus Mode) */}
            {!profile.focusMode && (
              <ScheduleGapAnalyzer tasks={tasks} onUpdateTasks={setTasks} />
            )}

            {/* Task completion trends charts (Hidden in Focus Mode) */}
            {!profile.focusMode && (
              <TaskTrendsChart tasks={tasks} />
            )}

            {/* 30-day task completion consistency heatmap (Hidden in Focus Mode) */}
            {!profile.focusMode && (
              <TaskHeatmap tasks={tasks} />
            )}

            {/* Main Critical Stack Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50 font-display flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-gray-800 dark:text-zinc-200" />
                    {profile.focusMode ? "THE CRITICAL ACTION FOCUS STACK" : "THE CRITICAL STACK"}
                    {!profile.focusMode && <span className="ml-2 text-xs font-normal text-gray-400 dark:text-zinc-500">AI PRIORITIZED</span>}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {profile.focusMode 
                      ? "Isolated, uncompleted focus items with high urgency score."
                      : "Tasks re-ranked dynamically based on time remaining, stated criticality, and effort."
                    }
                  </p>
                </div>

                {!profile.focusMode && (
                  <button
                    id="add-manual-task-toggle-btn"
                    onClick={() => setShowManualForm(!showManualForm)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Quick Add Task
                  </button>
                )}
              </div>

              {/* Search & Filter Bar */}
              <div id="critical-stack-search" className="relative flex items-center gap-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 shadow-xs transition-all focus-within:border-gray-400 dark:focus-within:border-zinc-700">
                <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tasks by title, category, or keyword..."
                  className="w-full bg-transparent border-none text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none font-sans"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <div className="flex-shrink-0 text-[10px] font-mono text-gray-400 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-gray-200/50 dark:border-zinc-700/50">
                  {visibleTasks.length} / {baseVisibleTasks.length}
                </div>
              </div>

              {/* Tag Filters Bar */}
              <div id="tag-filters-bar" className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2 shadow-xs transition-all">
                <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-550 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Labels:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTagId(null)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all border rounded-md cursor-pointer ${
                    selectedTagId === null
                      ? 'bg-black text-white border-black dark:bg-zinc-100 dark:text-black dark:border-zinc-100'
                      : 'bg-transparent text-gray-755 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-700'
                  }`}
                >
                  ALL
                </button>
                {(profile.customTags || []).map(tag => {
                  const isSelected = selectedTagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                      style={{
                        borderColor: tag.color,
                        backgroundColor: isSelected ? tag.color : 'transparent',
                        color: isSelected ? '#000000' : tag.color
                      }}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all border rounded-md cursor-pointer hover:opacity-85`}
                    >
                      {tag.name.toUpperCase()}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowTagManager(true)}
                  className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Manage Labels
                </button>
              </div>

              {/* Google Integration & Auto 1-Hour Alert Status Banner */}
              <div id="google-sync-alert-banner" className="transition-all duration-300">
                {googleUser && accessToken ? (
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/20 backdrop-blur-xs border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-emerald-900 dark:text-emerald-300 shadow-xs">
                    <div className="flex items-center gap-2.5 text-xs">
                      <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </div>
                      <div>
                        <p className="font-semibold text-[13px]">Auto 1-Hour Email Alerts Engaged</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Recipient: <strong className="font-medium text-emerald-800 dark:text-emerald-200">{googleUser.email}</strong> • Monitoring intervals active (15s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTriggerCheck(prev => prev + 1);
                          setToast({
                            message: "🔍 Background alert check forced! Searching for incompleted tasks due in ≤ 1 hour...",
                            type: 'success'
                          });
                        }}
                        className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-md transition-colors font-semibold cursor-pointer"
                      >
                        Force Check Alert
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-xs border border-amber-200/60 dark:border-amber-900/30 rounded-xl p-3.5 flex flex-col gap-3 text-amber-900 dark:text-amber-300 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-[13px]">Automatic 1-Hour Email Alerts Suspended</p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-450">Link your Google Account to automatically receive warning emails with task metrics & draft templates on impending deadlines.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogin}
                        className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5 font-sans whitespace-nowrap"
                      >
                        Link Google Account
                      </button>
                    </div>
                    <div className="pt-2 border-t border-amber-200/40 dark:border-amber-900/20 text-[10px] text-amber-700/85 dark:text-amber-400/85 flex items-start gap-1.5 leading-relaxed bg-amber-500/5 dark:bg-amber-500/2 px-2.5 py-1.5 rounded-md">
                      <span className="text-amber-600 dark:text-amber-500 font-mono text-xs select-none">⚠️</span>
                      <span>
                        <strong>Privacy Notice:</strong> The Kensei does not record or customize your personal data, drafts, or task details. However, to ensure maximum privacy, it is highly recommended to use a Google email account that does not contain highly sensitive personal information.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Task Add Dropdown Form */}
              <AnimatePresence>
                {showManualForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm"
                  >
                    <form onSubmit={handleAddManualTask} className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Task Title</label>
                          <input
                            type="text"
                            required
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder="e.g. Finish final slides"
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                          <input
                            type="text"
                            value={manualCategory}
                            onChange={(e) => setManualCategory(e.target.value)}
                            placeholder="e.g. Finance, Work, Personal"
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Description (Context)</label>
                        <textarea
                          value={manualDesc}
                          onChange={(e) => setManualDesc(e.target.value)}
                          placeholder="Provide details for AI breakdown or draft support..."
                          className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans h-20"
                        />
                      </div>

                      {/* Tag Assignments */}
                      <div>
                        <label className="block text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" /> Assign Labels
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {(profile.customTags || []).map(tag => {
                            const isSelected = selectedFormTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedFormTags(selectedFormTags.filter(id => id !== tag.id));
                                  } else {
                                    setSelectedFormTags([...selectedFormTags, tag.id]);
                                  }
                                }}
                                style={{
                                  borderColor: tag.color,
                                  backgroundColor: isSelected ? tag.color : 'transparent',
                                  color: isSelected ? '#000000' : tag.color
                                }}
                                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border transition-all cursor-pointer`}
                              >
                                {tag.name.toUpperCase()}
                              </button>
                            );
                          })}
                          {(profile.customTags || []).length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No custom labels created yet. Add some below using Manage Labels.</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Criticality</label>
                          <select
                            value={manualCriticality}
                            onChange={(e: any) => setManualCriticality(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans"
                          >
                            <option value="low">Low (minor inconvenience)</option>
                            <option value="medium">Medium (standard task)</option>
                            <option value="high">High (serious bottleneck)</option>
                            <option value="critical">Critical (loss of service/fail)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Due In (Hours)</label>
                          <input
                            type="number"
                            min={1}
                            max={168}
                            value={manualHoursOffset}
                            onChange={(e) => setManualHoursOffset(parseInt(e.target.value) || 12)}
                            className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            id="submit-manual-task-btn"
                            type="submit"
                            className="w-full bg-black dark:bg-zinc-100 hover:opacity-90 dark:hover:opacity-100 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold py-2.5 px-4 text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                          >
                            Submit Task to Stack
                          </button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tasks List */}
              <div className="relative group p-4 rounded-2xl transition-all duration-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20">
                {/* Interactive SVG Grid Background */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000"
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, #a1a1aa 1px, transparent 0)`,
                    backgroundSize: `${Math.max(10, 40 - (stressIndex / 4))}px ${Math.max(10, 40 - (stressIndex / 4))}px`,
                    opacity: stressIndex / 200,
                  }}
                  animate={{
                    opacity: stressIndex / 200 + 0.1,
                  }}
                />
                
                <div className="relative z-10 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {visibleTasks.length > 0 ? (
                      visibleTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onUpdateTask={handleUpdateTask}
                          onDeleteTask={handleDeleteTask}
                          accessToken={accessToken}
                          googleUser={googleUser}
                          customTags={profile.customTags || []}
                        />
                      ))
                    ) : (
                      <motion.div
                        key="empty-stack-placeholder"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl py-12 text-center text-gray-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 shadow-sm"
                      >
                        <CheckCircle className="w-8 h-8 text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Your stack is completely clear!</h4>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">No pending high-priority tasks in focus.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* AI Conversational Chatbot */}
      <LifesaverChatbot 
        userName={profile.name} 
        tasks={tasks}
        onTriggerAddTask={() => setShowManualForm(true)}
      />

      {/* Demo Warning Banner */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-800/60 p-4 text-center rounded-xl">
          <p className="text-xs text-amber-800 dark:text-amber-400 font-medium flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
            <span>
              <strong>Demo Notice:</strong> This is a demo and a sample of the website. 
              {googleUser ? " You are signed in with Google and can store your real data." : " If you sign in with Google, you can store your real data."}
            </span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-zinc-850 py-6 px-4 bg-white dark:bg-zinc-900 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-zinc-500">
          <p>© 2026 Kensei. Powered by AI LLM intelligence.</p>
          <div className="flex gap-4">
            <span className="font-mono text-[10px]">VER: 1.0 (PREMIUM)</span>
            <span className="font-mono text-[10px]">UTC: 2026-06-25</span>
          </div>
        </div>
      </footer>

      {/* Dynamic System Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            id="system-notification-toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-xl flex items-start gap-3 max-w-sm ${
              toast.type === 'alert' 
                ? 'bg-red-50 border-red-200 text-red-900 shadow-red-100' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${toast.type === 'alert' ? 'text-red-600' : 'text-emerald-600'}`} />
            <div className="flex-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider font-mono">System Notification</h4>
              <p className="text-xs mt-1 font-sans leading-relaxed">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors focus:outline-none"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Manager Modal Overlay */}
      <AnimatePresence>
        {showTagManager && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[100]"
              onClick={() => setShowTagManager(false)}
            />
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 m-auto sm:max-w-md max-h-[500px] h-fit z-[101] bg-white dark:bg-zinc-950 border-2 border-black dark:border-zinc-850 rounded-none shadow-2xl flex flex-col overflow-hidden text-gray-900 dark:text-zinc-100"
            >
              <div className="bg-black text-white p-4 flex items-center justify-between">
                <h3 className="text-xs font-black font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#DFE104]" /> Manage Custom Labels
                </h3>
                <button 
                  onClick={() => setShowTagManager(false)}
                  className="text-gray-400 hover:text-white p-1 hover:bg-zinc-900 border border-transparent hover:border-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-5 flex-grow overflow-y-auto space-y-4 bg-white dark:bg-zinc-950">
                {/* Create Tag Sub-form */}
                <div className="border border-gray-200 dark:border-zinc-800 p-3.5 rounded-none bg-zinc-50 dark:bg-zinc-900/40">
                  <h4 className="text-[10px] font-mono font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Create New Label</h4>
                  <div className="flex gap-2 items-end">
                    <div className="flex-grow">
                      <label className="block text-[9px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Label Name</label>
                      <input
                        type="text"
                        id="new-tag-name-input"
                        placeholder="e.g. Design, Sprint-1"
                        className="w-full bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 px-3 py-1.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500 font-sans"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const btn = document.getElementById('create-tag-submit-btn');
                            if (btn) btn.click();
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Color</label>
                      <input
                        type="color"
                        id="new-tag-color-input"
                        defaultValue="#6366F1"
                        className="w-12 h-8 border-2 border-black dark:border-zinc-700 bg-transparent p-0 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      id="create-tag-submit-btn"
                      onClick={async () => {
                        const nameInput = document.getElementById('new-tag-name-input') as HTMLInputElement;
                        const colorInput = document.getElementById('new-tag-color-input') as HTMLInputElement;
                        if (!nameInput || !nameInput.value.trim()) return;
                        
                        const newTag = {
                          id: 'tag-' + Math.random().toString(36).substring(2, 11),
                          name: nameInput.value.trim(),
                          color: colorInput.value
                        };
                        
                        const updatedTags = [...(profile.customTags || []), newTag];
                        handleUpdateProfile({ ...profile, customTags: updatedTags });
                        
                        // Save tag list to server
                        await fetch('/api/profile', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ customTags: updatedTags })
                        });
                        
                        nameInput.value = '';
                      }}
                      className="bg-black hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 border-2 border-black dark:border-zinc-700 px-4 py-1.5 text-xs font-bold font-mono uppercase cursor-pointer transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </div>
                
                {/* List of Custom Tags */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Active Labels</h4>
                  {(profile.customTags || []).length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-zinc-550 italic">No custom labels created yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-zinc-900">
                      {(profile.customTags || []).map(tag => (
                        <div key={tag.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <span 
                              style={{ backgroundColor: tag.color }} 
                              className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                            />
                            <span className="text-xs font-mono font-bold uppercase tracking-tight text-gray-800 dark:text-zinc-200">{tag.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              // Remove tag from global profile list
                              const updatedTags = (profile.customTags || []).filter(t => t.id !== tag.id);
                              handleUpdateProfile({ ...profile, customTags: updatedTags });
                              
                              // Also remove tag ID from any tasks that have it!
                              const updatedTasks = tasks.map(task => {
                                if (task.tags && task.tags.includes(tag.id)) {
                                  return { ...task, tags: task.tags.filter(tid => tid !== tag.id) };
                                }
                                return task;
                              });
                              setTasks(updatedTasks);
                              
                              // Sync to database
                              await fetch('/api/profile', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ customTags: updatedTags })
                              });
                              
                              // Sync affected tasks back to database
                              const affectedTasks = tasks.filter(task => task.tags && task.tags.includes(tag.id));
                              for (const affectedTask of affectedTasks) {
                                const updatedTask = { ...affectedTask, tags: (affectedTask.tags || []).filter(tid => tid !== tag.id) };
                                await fetch(`/api/tasks/${affectedTask.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedTask)
                                });
                              }
                            }}
                            className="text-[10px] text-red-500 hover:text-red-700 font-mono font-black uppercase tracking-wider cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
