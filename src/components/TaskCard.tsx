import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Clock, Sparkles, AlertTriangle, CheckCircle, Circle, 
  ChevronDown, ChevronUp, Trash2, Copy, Calendar, 
  MessageSquare, Loader2, Check, RefreshCw, Mail,
  Briefcase, Heart, DollarSign, Home, User, Folder
} from 'lucide-react';
import { Task, SubTask, Tag } from '../types';
import { formatLocalWallClockDate } from '../lib/timeUtils';

interface TaskCardProps {
  key?: string;
  task: Task;
  onUpdateTask: (updated: Task) => void;
  onDeleteTask: (id: string) => void;
  accessToken: string | null;
  googleUser: any;
  customTags?: Tag[];
}

export function TaskCard({ task, onUpdateTask, onDeleteTask, accessToken, googleUser, customTags = [] }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isJustCompleted, setIsJustCompleted] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [customRescheduleDate, setCustomRescheduleDate] = useState('');

  const convertToLocalDatetimeLocal = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISODate = new Date(d.getTime() - tzOffset).toISOString();
      return localISODate.slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (task.dueDate) {
      setCustomRescheduleDate(convertToLocalDatetimeLocal(task.dueDate));
    }
  }, [task.dueDate, showReschedule]);

  const calculateNewUrgencyScore = (criticality: string, dueDateStr: string) => {
    let score = 5.0;
    if (criticality === 'critical') score += 3.0;
    else if (criticality === 'high') score += 1.5;
    else if (criticality === 'low') score -= 2.0;

    const hoursRemaining = (new Date(dueDateStr).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 3) score += 2.0;
    else if (hoursRemaining < 12) score += 1.0;
    else if (hoursRemaining > 48) score -= 1.0;

    return Math.min(Math.max(score, 1.0), 10.0);
  };

  const handleReschedule = async (newDueDateIso: string) => {
    const newUrgency = calculateNewUrgencyScore(task.criticality, newDueDateIso);
    const updatedTask = {
      ...task,
      dueDate: newDueDateIso,
      urgencyScore: newUrgency
    };
    onUpdateTask(updatedTask);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (err) {
      console.error("Failed to save rescheduled due date:", err);
    }
  };


  // Calculate dynamic countdowns
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const due = new Date(task.dueDate);
      const diffMs = due.getTime() - now.getTime();
      const absDiff = Math.abs(diffMs);

      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      if (diffMs <= 0) {
        setIsOverdue(true);
        let overdueStr = 'OVERDUE BY ';
        if (days > 0) overdueStr += `${days}d ${hours}h ${minutes}m`;
        else if (hours > 0) overdueStr += `${hours}h ${minutes}m ${seconds}s`;
        else if (minutes > 0) overdueStr += `${minutes}m ${seconds}s`;
        else overdueStr += `${seconds}s`;
        setTimeRemaining(overdueStr);
        return;
      }

      setIsOverdue(false);
      let timeStr = 'DUE IN ';
      if (days > 0) {
        timeStr += `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        timeStr += `${hours}h ${minutes}m ${seconds}s`;
      } else {
        timeStr += `${minutes}m ${seconds}s`;
      }
      setTimeRemaining(timeStr);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000); // refresh every second for high fidelity
    return () => clearInterval(interval);
  }, [task.dueDate]);

  // Handle checking off subtask
  const toggleSubTask = async (stepId: string) => {
    const updatedSteps = task.steps.map(step => {
      if (step.id === stepId) {
        return { ...step, completed: !step.completed };
      }
      return step;
    });

    // Check if the current immediate next step was this step, then update it
    const nextUncompleted = updatedSteps.find(s => !s.completed);
    const immediateNextStep = nextUncompleted ? nextUncompleted.title : "All steps completed! Polish & submit.";

    const updatedTask = {
      ...task,
      steps: updatedSteps,
      immediateNextStep
    };

    onUpdateTask(updatedTask);

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (err) {
      console.error("Failed to save subtask toggle on server:", err);
    }
  };

  // AI Break Down Into Steps
  const handleDeconstruct = async () => {
    setIsDeconstructing(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/deconstruct`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Deconstruction failed');
      const updatedTask = await res.json();
      onUpdateTask(updatedTask);
      setIsExpanded(true); // Open to show steps
    } catch (err) {
      console.error(err);
      alert("AI failed to break down the task. Please try again.");
    } finally {
      setIsDeconstructing(false);
    }
  };

  // AI Draft Content
  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customInstruction: draftPrompt })
      });
      if (!res.ok) throw new Error('Drafting failed');
      const data = await res.json();
      onUpdateTask({ ...task, draft: data.draft, draftIssuedAt: data.draftIssuedAt });
      setShowDraftModal(true);
    } catch (err) {
      console.error(err);
      alert("AI failed to generate execution draft.");
    } finally {
      setIsDrafting(false);
    }
  };

  // Enhance Draft with task details
  const handleEnhanceDraft = async () => {
    setIsDrafting(true);
    try {
      const detailsInstructions = `Please take the current draft and append a highly detailed, professional, and readable 'TASK EXECUTION DOSSIER & CONTEXT BRIEF' section below it. 
Inside this section, explicitly list:
- Task Description: "${task.description || 'N/A'}"
- Due Date & Timeline: "${formatLocalWallClockDate(task.dueDate)}"
- Urgency Score Metric: "${task.urgencyScore.toFixed(1)}/10.0"
- Criticality Rating: "${task.criticality.toUpperCase()}"
- Immediate Next Action Step: "${task.immediateNextStep}"
- Sub-Steps Action Checklist:
${task.steps && task.steps.length > 0 ? task.steps.map((s, idx) => `  * [${s.completed ? '✓' : ' '}] Step ${idx + 1}: ${s.title} (${s.duration} mins)`).join('\n') : '  * Complete main objective'}

Ensure you maintain the original draft intact at the top, and output the enhanced details section cleanly appended below with professional styling and markers.`;

      const res = await fetch(`/api/tasks/${task.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customInstruction: detailsInstructions })
      });
      if (!res.ok) throw new Error('AI Enhancement failed');
      const data = await res.json();
      onUpdateTask({ ...task, draft: data.draft, draftIssuedAt: data.draftIssuedAt });
    } catch (err) {
      console.error("AI draft enhancement failed, applying client-side high-fidelity formatting:", err);
      // Beautiful fallback layout in case of network issue
      const formattedDue = formatLocalWallClockDate(task.dueDate);
      const formattedCreated = formatLocalWallClockDate(task.createdAt);
      const stepsList = task.steps && task.steps.length > 0 
        ? task.steps.map((s, idx) => `  ${idx + 1}. [${s.completed ? '✓' : ' '}] ${s.title} (${s.duration}m)`).join('\n') 
        : '  - Complete main objective';

      const detailsBlock = `\n\n=======================================================\n🚨 TASK EXECUTION BRIEF & SPECIFICATIONS 🚨\n=======================================================\n• Title: ${task.title}\n• Context/Description: ${task.description || 'No description provided.'}\n• Category: ${task.category}\n• Criticality: ${task.criticality.toUpperCase()} (Urgency: ${task.urgencyScore.toFixed(1)}/10.0)\n• Committed Time: ${formattedCreated}\n• Hard Deadline: ${formattedDue}\n\n➡️ IMMEDIATE PHYSICAL NEXT STEP:\n"${task.immediateNextStep}"\n\n📋 DETAILED STEPS & SUB-TASKS CHRONOLOGY:\n${stepsList}\n=======================================================`;

      const enhancedText = (task.draft || '') + detailsBlock;
      const updatedTask = { ...task, draft: enhancedText, draftIssuedAt: new Date().toISOString() };
      onUpdateTask(updatedTask);
      
      // Persist to server
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } finally {
      setIsDrafting(false);
    }
  };

  // Add Focus Block Schedule
  const handleAddFocusBlock = async () => {
    // Generate a block based on task duration or default to 30 mins from now or in free gaps
    const now = new Date();
    // Schedule 1 hour from now for immediate focus block
    const startTime = new Date(now.getTime() + 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    
    const formatDate = (d: Date) => {
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${mins}`;
    };

    const blockString = `Today ${formatDate(startTime)} - ${formatDate(endTime)}`;
    
    if (task.focusBlocks.includes(blockString)) {
      alert("Focus block already scheduled!");
      return;
    }

    const updatedTask = {
      ...task,
      focusBlocks: [...task.focusBlocks, blockString]
    };

    onUpdateTask(updatedTask);

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendGmailAlert = async () => {
    if (!accessToken || !googleUser) {
      alert("Please connect your Google Account in Profile Settings first.");
      return;
    }

    const confirmed = window.confirm(`Send an urgent Gmail action alert for "${task.title}" to your inbox (${googleUser.email})?`);
    if (!confirmed) return;

    setIsSendingEmail(true);
    try {
      const getRemainingTimeText = () => {
        const now = new Date();
        const due = new Date(task.dueDate);
        const diffMs = due.getTime() - now.getTime();
        const absDiff = Math.abs(diffMs);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffMs <= 0) {
          return `OVERDUE BY ${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;
        }
        return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;
      };
      const emailTimeLeft = getRemainingTimeText();

      const stepsList = task.steps.length > 0 
        ? task.steps.map(s => `<li><strong>${s.title}</strong> (${s.duration} mins) - ${s.completed ? '✅ Completed' : '⏳ Pending'}</li>`).join('')
        : '<li>No micro-steps deconstructed yet. Click "Break Down Steps" to generate.</li>';
      
      const emailSubject = `🚨 [URGENT] Kensei Action Alert: ${task.title}`;
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #1d1d1f;">
          <div style="background-color: #111827; color: #ffffff; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em; text-transform: uppercase;">Kensei AI</h1>
            <p style="margin: 4px 0 0; font-size: 11px; font-family: monospace; color: #9ca3af; letter-spacing: 0.05em;">CRITICAL ACTION PLAN ALERT</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <div style="display: inline-block; font-size: 10px; font-family: monospace; font-weight: 700; background-color: #fef2f2; color: #b91c1c; padding: 4px 10px; border-radius: 9999px; border: 1px solid #fee2e2; text-transform: uppercase; margin-bottom: 12px;">Urgency Score: ${task.urgencyScore.toFixed(1)}/10.0</div>
            <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">${task.title}</h2>
            <p style="font-size: 14px; color: #4b5563; margin: 0; line-height: 1.5;">${task.description || 'No description provided.'}</p>
          </div>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 14px 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; line-height: 1.5; color: #374151;">
            <p style="margin: 0; font-size: 11px; font-family: monospace; font-weight: bold; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">⏳ DEADLINE CONTROL METRICS</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-weight: 500;">Complete By (Deadline):</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #111827;">${formatDeadline(task.dueDate)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-weight: 500;">Time Remaining:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right; color: ${isOverdue ? '#dc2626' : '#10b981'};">${emailTimeLeft}</td>
              </tr>
              ${task.draftIssuedAt ? `
              <tr>
                <td style="padding: 4px 0; color: #6b7280; font-weight: 500;">Draft Issued On:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #111827;">${formatDeadline(task.draftIssuedAt)}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; padding: 14px 16px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 11px; font-family: monospace; font-weight: bold; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">🔮 Immediate Next Step</p>
            <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 600; color: #065f46; line-height: 1.4;">${task.immediateNextStep}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 12px; font-family: monospace; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">Micro-Steps Roadmap</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #374151; line-height: 1.6;">
              ${stepsList}
            </ul>
          </div>

          ${task.draft ? `
          <div style="background-color: #fafafa; border: 1px solid #f3f4f6; padding: 16px; border-radius: 12px; font-size: 13px; color: #4b5563; font-family: monospace; white-space: pre-wrap; margin-bottom: 24px; line-height: 1.5;">
            <strong style="font-family: sans-serif; font-size: 11px; color: #9ca3af; text-transform: uppercase; display: block; margin-bottom: 8px;">AI Prepared Draft</strong>
            ${task.draft}
          </div>
          ` : ''}

          <div style="font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px; line-height: 1.4;">
            This is an urgent productivity backup notification from your Kensei Companion. Stay focused, execute the micro-steps, and conquer the deadline.
          </div>
        </div>
      `;

      // Construct RFC 2822 email format and encode as base64url
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

      alert(`🎉 Urgent Gmail Action Alert sent successfully to your inbox: ${googleUser.email}!`);
    } catch (err: any) {
      console.warn('Failed to send Gmail:', err.message || err);
      alert('Failed to send Gmail alert. This is often due to expired sessions, mock auth tokens, or disabled APIs in sandbox/test environments. Please re-connect your Google account in Profile Settings.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSyncToGoogleCalendar = async (blockText: string) => {
    if (!accessToken) {
      alert("Please connect your Google Account in Profile Settings first.");
      return;
    }

    const confirmed = window.confirm(`Sync focus block "${blockText}" for task "${task.title}" to your real Google Calendar?`);
    if (!confirmed) return;

    setIsSyncingCalendar(true);
    try {
      // Parse blockText: e.g., "Today 15:30 - 16:00"
      const timeMatch = blockText.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
      let startDateTime = new Date();
      let endDateTime = new Date();

      if (timeMatch) {
        const [_, startH, startM, endH, endM] = timeMatch;
        startDateTime.setHours(parseInt(startH), parseInt(startM), 0, 0);
        endDateTime.setHours(parseInt(endH), parseInt(endM), 0, 0);
      } else {
        // Fallback: 1 hour duration starting in 1 hour
        startDateTime = new Date(Date.now() + 60 * 60 * 1000);
        endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
      }

      const eventPayload = {
        summary: `🚨 Focus Block: ${task.title}`,
        description: `Task Description: ${task.description || ''}\n\nImmediate Next Step: ${task.immediateNextStep}\n\nScheduled via Kensei.`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        colorId: '6' // Sky/cyan color in calendar events
      };

      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });

      if (!calRes.ok) {
        throw new Error('Google Calendar API error');
      }

      alert('📅 Scheduled focus block synchronized perfectly with your Google Calendar!');
    } catch (err) {
      console.error('Failed to sync to Google Calendar:', err);
      alert('Failed to sync event to Google Calendar. Please make sure Google Calendar Sync is connected.');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Toggle general task completion
  const handleToggleComplete = async () => {
    const isNowCompleted = !task.completed;
    const updatedTask = {
      ...task,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined
    };
    onUpdateTask(updatedTask);

    if (isNowCompleted) {
      setIsJustCompleted(true);
      setTimeout(() => setIsJustCompleted(false), 1500);

      // Trigger beautiful, satisfying colorful confetti
      // Cannon 1: Left corner
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444']
      });

      // Cannon 2: Right corner
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444']
      });

      // Cannon 3: Central pop shortly after
      setTimeout(() => {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444']
        });
      }, 200);
    }

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    if (task.draft) {
      navigator.clipboard.writeText(task.draft);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    }
  };

  const formatDeadline = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  // Helper colors for urgency
  const getUrgencyStyles = (score: number) => {
    if (score >= 8.5) return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40' };
    if (score >= 6.0) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40' };
    return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' };
  };

  const getLeftBorderColor = (score: number) => {
    if (score >= 8.5) return 'border-l-red-500';
    if (score >= 6.0) return 'border-l-amber-500';
    return 'border-l-blue-500';
  };

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case 'critical': return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-150 dark:border-red-900/40';
      case 'high': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-150 dark:border-amber-900/40';
      case 'medium': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-150 dark:border-blue-900/40';
      default: return 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-150 dark:border-zinc-700';
    }
  };

  const getCategoryDetails = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('work') || cat.includes('academic') || cat.includes('school') || cat.includes('study') || cat.includes('brief')) {
      return {
        icon: <Briefcase className="w-3.5 h-3.5" />,
        style: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40'
      };
    }
    if (cat.includes('finance') || cat.includes('bill') || cat.includes('pay') || cat.includes('money') || cat.includes('tax') || cat.includes('budget')) {
      return {
        icon: <DollarSign className="w-3.5 h-3.5" />,
        style: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
      };
    }
    if (cat.includes('health') || cat.includes('medical') || cat.includes('exercise') || cat.includes('wellness')) {
      return {
        icon: <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />,
        style: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
      };
    }
    if (cat.includes('household') || cat.includes('home') || cat.includes('house') || cat.includes('clean') || cat.includes('grocer')) {
      return {
        icon: <Home className="w-3.5 h-3.5" />,
        style: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
      };
    }
    if (cat.includes('personal') || cat.includes('self') || cat.includes('growth')) {
      return {
        icon: <User className="w-3.5 h-3.5" />,
        style: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
      };
    }
    return {
      icon: <Folder className="w-3.5 h-3.5" />,
      style: 'bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700/60'
    };
  };

  const urgency = getUrgencyStyles(task.urgencyScore);
  const progressPercent = task.steps.length > 0 
    ? Math.round((task.steps.filter(s => s.completed).length / task.steps.length) * 100) 
    : 0;

  return (
    <motion.div 
      id={`task-card-${task.id}`}
      layout="position"
      initial={{ opacity: 0, y: 15 }}
      animate={{
        scale: isJustCompleted ? 1.02 : 1,
        y: isJustCompleted ? -4 : 0,
        boxShadow: isJustCompleted 
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        opacity: task.completed ? 0.6 : 1,
      }}
      exit={{ 
        opacity: 0, 
        x: 180, 
        scale: 0.9, 
        filter: "blur(4px)",
        transition: { duration: 0.35, ease: "easeIn" } 
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: isJustCompleted ? 12 : 20
      }}
      className={`relative overflow-hidden border-2 border-l-[6px] bg-white dark:bg-zinc-900 border-[#18181B] dark:border-[#3F3F46] rounded-none p-6 transition-all duration-200 group hover:bg-[#DFE104] hover:text-black hover:border-[#18181B] dark:hover:bg-[#DFE104] dark:hover:text-black dark:hover:border-black ${getLeftBorderColor(task.urgencyScore)} ${
        task.completed ? 'opacity-60 border-zinc-200 dark:border-zinc-800' : ''
      }`}
    >
      {/* Rewarding celebration stamp/overlay */}
      <AnimatePresence>
        {isJustCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotate: -25 }}
            animate={{ opacity: 1, scale: 1.05, rotate: -6 }}
            exit={{ opacity: 0, scale: 1.4, rotate: 12, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 12 }}
            className="absolute inset-0 z-50 bg-emerald-500/10 pointer-events-none flex items-center justify-center backdrop-blur-[1px] rounded-2xl"
          >
            <div className="bg-white/95 dark:bg-zinc-900/95 border-2 border-emerald-500 shadow-2xl px-6 py-3 rounded-2xl flex items-center gap-3 transform rotate-[-4deg] animate-bounce">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <span className="font-display font-black text-emerald-600 tracking-wider text-sm md:text-base uppercase">
                THE DAY IS SAVED!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Title / Primary Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <motion.button 
            id={`toggle-complete-btn-${task.id}`}
            onClick={handleToggleComplete}
            whileHover={{ scale: 1.2, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="mt-1 flex-shrink-0 text-gray-400 hover:text-emerald-600 transition-all cursor-pointer focus:outline-none"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={task.completed ? 'completed' : 'pending'}
                initial={{ scale: 0.6, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.6, rotate: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              >
                {task.completed ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 fill-emerald-50" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300 hover:border-emerald-500 transition-colors" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          
          <div>
            <h3 className={`text-base sm:text-lg font-bold font-display uppercase tracking-tight text-gray-900 dark:text-zinc-100 transition-colors duration-200 group-hover:text-black ${task.completed ? 'line-through opacity-60' : ''}`}>
              {task.title}
            </h3>
            <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5 transition-colors duration-200 group-hover:text-zinc-800" title="Exact creation date and time">
              Added: {formatDeadline(task.createdAt)}
            </div>
            <p className="text-sm text-gray-600 dark:text-zinc-350 mt-1 max-w-xl transition-colors duration-200 group-hover:text-zinc-900 leading-relaxed">
              {task.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              {(() => {
                const catDetails = getCategoryDetails(task.category);
                return (
                  <span className={`text-xs font-mono tracking-tight px-2.5 py-1 rounded-none border-2 flex items-center gap-1.5 font-semibold transition-all group-hover:bg-black group-hover:text-white group-hover:border-black ${catDetails.style}`} title={`Category: ${task.category}`}>
                    {catDetails.icon}
                    {task.category.toUpperCase()}
                  </span>
                );
              })()}
              {task.tags && task.tags.map(tagId => {
                const tag = (customTags || []).find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <span 
                    key={tag.id}
                    style={{ borderColor: tag.color, color: tag.color }}
                    className="text-[10px] font-mono tracking-tight px-2 py-0.5 rounded-none border-2 bg-transparent font-bold uppercase"
                  >
                    {tag.name}
                  </span>
                );
              })}
              <span className={`text-xs font-mono uppercase px-2.5 py-1 rounded-none border-2 group-hover:bg-black group-hover:text-white group-hover:border-black ${getCriticalityBadge(task.criticality)}`}>
                {task.criticality}
              </span>
              {task.estimatedEffort && (
                <span className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1 bg-gray-50 dark:bg-zinc-850 border-2 border-gray-200 dark:border-zinc-700/60 px-2.5 py-1 rounded-none font-mono uppercase group-hover:bg-black group-hover:text-white group-hover:border-black">
                  <Clock className="w-3 h-3" /> {task.estimatedEffort}
                </span>
              )}
              {task.draft && (
                <span className="text-xs text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/20 border-2 border-pink-200 dark:border-pink-900/30 px-2.5 py-1 rounded-none flex items-center gap-1 font-mono group-hover:bg-black group-hover:text-pink-300 group-hover:border-black" title={`Draft generated at ${task.draftIssuedAt ? formatDeadline(task.draftIssuedAt) : 'N/A'}`}>
                  <MessageSquare className="w-3.5 h-3.5 text-pink-500" /> DRAFT READY
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Urgency Badge */}
        <div className="text-right flex-shrink-0">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold font-mono ${urgency.bg} ${urgency.text}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            SCORE: {task.urgencyScore.toFixed(1)}
          </div>
          <div className={`text-[11px] font-mono mt-1.5 font-bold ${isOverdue ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-zinc-400'}`}>
            {timeRemaining}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono mt-1" title="Exact completion deadline">
            Due: {formatDeadline(task.dueDate)}
          </div>
        </div>
      </div>

      {/* Immediate Next Step (Callout Box) */}
      {!task.completed && (
        <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <span className="mt-1 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-extrabold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> NEXT:
          </span>
          <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">
            {task.immediateNextStep}
          </p>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="mt-5 pt-4 border-t-2 border-[#18181B] dark:border-[#3F3F46] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Deconstruct Engine */}
          <button
            id={`deconstruct-btn-${task.id}`}
            onClick={handleDeconstruct}
            disabled={isDeconstructing || task.completed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-tight rounded-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 hover:bg-[#DFE104] hover:text-black hover:border-black dark:hover:bg-[#DFE104] dark:hover:text-black dark:hover:border-black border-2 border-[#18181B] dark:border-[#3F3F46] transition-all disabled:opacity-40 cursor-pointer"
          >
            {isDeconstructing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                DECONSTRUCTING...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                BREAK DOWN STEPS
              </>
            )}
          </button>

          {/* Draft It For Me */}
          <button
            id={`draft-btn-${task.id}`}
            onClick={() => {
              if (task.draft) {
                setShowDraftModal(true);
              } else {
                handleGenerateDraft();
              }
            }}
            disabled={isDrafting || task.completed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-tight rounded-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 hover:bg-[#DFE104] hover:text-black hover:border-black dark:hover:bg-[#DFE104] dark:hover:text-black dark:hover:border-black border-2 border-[#18181B] dark:border-[#3F3F46] transition-all disabled:opacity-40 cursor-pointer"
          >
            {isDrafting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                DRAFTING...
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-pink-500" />
                {task.draft ? "VIEW AI DRAFT" : "DRAFT RESPONSE"}
              </>
            )}
          </button>

          {/* Add Focus Block */}
          <button
            id={`add-focus-btn-${task.id}`}
            onClick={handleAddFocusBlock}
            disabled={task.completed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-tight rounded-none bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 hover:bg-[#DFE104] hover:text-black hover:border-black dark:hover:bg-[#DFE104] dark:hover:text-black dark:hover:border-black border-2 border-[#18181B] dark:border-[#3F3F46] transition-all disabled:opacity-40 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            ADD FOCUS BLOCK
          </button>

          {/* Send Gmail Alert */}
          <button
            id={`gmail-alert-btn-${task.id}`}
            onClick={handleSendGmailAlert}
            disabled={isSendingEmail || task.completed}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-tight rounded-none transition-all disabled:opacity-40 cursor-pointer border-2 ${
              accessToken 
                ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-500 dark:bg-red-950/20 dark:text-red-350 dark:hover:bg-red-950/45 dark:border-red-900/40' 
                : 'bg-white text-gray-500 hover:bg-[#DFE104] hover:text-black hover:border-black border-[#18181B] dark:bg-zinc-900 dark:text-zinc-400 dark:border-[#3F3F46] dark:hover:bg-[#DFE104] dark:hover:text-black dark:hover:border-black'
            }`}
            title={accessToken ? "Send Gmail briefing to your inbox" : "Google authorization required to send Gmail briefs"}
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                SENDING GMAIL...
              </>
            ) : (
              <>
                <Mail className={`w-3.5 h-3.5 ${accessToken ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-zinc-500'}`} />
                EMAIL BRIEFING
              </>
            )}
          </button>

          {/* Snooze / Reschedule Button */}
          <button
            id={`reschedule-btn-${task.id}`}
            onClick={() => setShowReschedule(!showReschedule)}
            disabled={task.completed}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-tight rounded-none border-2 transition-all cursor-pointer ${
              showReschedule
                ? 'bg-[#DFE104] text-black border-black dark:bg-[#DFE104] dark:text-black dark:border-black'
                : 'bg-white text-gray-755 border-[#18181B] dark:bg-zinc-900 dark:text-zinc-200 dark:border-[#3F3F46] hover:bg-[#DFE104] hover:text-black hover:border-black dark:hover:bg-[#DFE104] dark:hover:text-black dark:hover:border-black'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            SNOOZE / RESCHEDULE
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Steps count & expand toggle */}
          {(task.steps.length > 0 || task.draft || (customTags && customTags.length > 0)) && (
            <button
              id={`toggle-steps-btn-${task.id}`}
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-[11px] font-bold font-mono uppercase text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 px-2 py-1 rounded-none hover:bg-[#DFE104] hover:text-black border border-transparent hover:border-black transition-colors cursor-pointer"
            >
              {task.steps.length > 0 ? (
                <>
                  <span>{task.steps.filter(s => s.completed).length}/{task.steps.length} STEPS</span>
                  <div className="w-5 h-5 rounded-none bg-gray-100 dark:bg-zinc-800 text-[10px] flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-zinc-750">
                    {progressPercent}%
                  </div>
                </>
              ) : task.draft ? (
                <span>VIEW WORK NOTEPAD</span>
              ) : (
                <span>MANAGE LABELS</span>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {/* Delete Button */}
          <button
            id={`delete-btn-${task.id}`}
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-none border-2 border-transparent hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Rescheduling Panel */}
      <AnimatePresence>
        {showReschedule && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-150 dark:border-zinc-800/80 overflow-hidden"
          >
            <div className="bg-orange-50/30 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3.5">
              <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                SNOOZE OR POSTPONE DEADLINE
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                Current deadline: <span className="font-mono font-semibold text-gray-800 dark:text-zinc-200">{formatDeadline(task.dueDate)}</span>
              </p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + 1);
                    handleReschedule(d.toISOString());
                    setShowReschedule(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  +1 Hour
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + 3);
                    handleReschedule(d.toISOString());
                    setShowReschedule(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  +3 Hours
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    handleReschedule(d.toISOString());
                    setShowReschedule(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  Tomorrow (+24h)
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    handleReschedule(d.toISOString());
                    setShowReschedule(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  +3 Days
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    handleReschedule(d.toISOString());
                    setShowReschedule(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-850 cursor-pointer"
                >
                  +1 Week
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={customRescheduleDate}
                  onChange={(e) => setCustomRescheduleDate(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-850 rounded-md text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <button
                  onClick={() => {
                    if (customRescheduleDate) {
                      const d = new Date(customRescheduleDate);
                      if (!isNaN(d.getTime())) {
                        handleReschedule(d.toISOString());
                        setShowReschedule(false);
                      } else {
                        alert("Please select a valid date and time");
                      }
                    }
                  }}
                  className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md cursor-pointer"
                >
                  Apply Custom
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus Blocks Scheduled */}
      {task.focusBlocks.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono uppercase tracking-wider">Scheduled:</span>
          {task.focusBlocks.map((block, i) => (
            <span key={i} className="text-xs bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-900/30 font-mono flex items-center gap-1 shadow-xs">
              <Calendar className="w-3 h-3" />
              {block}
              {accessToken && (
                <button
                  onClick={() => handleSyncToGoogleCalendar(block)}
                  disabled={isSyncingCalendar}
                  className="ml-1.5 hover:text-sky-900 dark:hover:text-sky-100 border-l pl-1.5 border-sky-200 dark:border-sky-900/40 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-100/50 dark:hover:bg-sky-950/40 rounded px-1 flex items-center gap-0.5 cursor-pointer"
                  title="Sync Focus Block to Real Google Calendar"
                >
                  {isSyncingCalendar ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-sky-600" />
                  ) : (
                    <RefreshCw className="w-2.5 h-2.5" />
                  )}
                  <span>Sync Cal</span>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Subtasks and Draft Notepad Expanded Section */}
      <AnimatePresence>
        {isExpanded && (task.steps.length > 0 || task.draft || (customTags && customTags.length > 0)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4 pl-4 border-l-[4px] border-[#18181B] dark:border-[#3F3F46]"
          >
            {customTags && customTags.length > 0 && (
              <div className="space-y-2 py-1 mb-5">
                <h4 className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest flex items-center justify-between mb-3">
                  <span>Assign Labels</span>
                  <span className="font-normal text-[10px]">TOGGLE COLOR-CODED TAGS FOR THIS TASK</span>
                </h4>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-none bg-zinc-50 dark:bg-zinc-900/30 border-2 border-dashed border-gray-200 dark:border-zinc-800">
                  {customTags.map(tag => {
                    const isAssigned = task.tags && task.tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={async () => {
                          const currentTags = task.tags || [];
                          const updatedTags = currentTags.includes(tag.id)
                            ? currentTags.filter(id => id !== tag.id)
                            : [...currentTags, tag.id];
                          const updatedTask = { ...task, tags: updatedTags };
                          onUpdateTask(updatedTask);
                          
                          try {
                            await fetch(`/api/tasks/${task.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updatedTask)
                            });
                          } catch (err) {
                            console.error("Failed to update task tags:", err);
                          }
                        }}
                        style={{
                          borderColor: tag.color,
                          backgroundColor: isAssigned ? tag.color : 'transparent',
                          color: isAssigned ? '#000000' : 'currentColor'
                        }}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border transition-all cursor-pointer hover:opacity-90`}
                      >
                        {tag.name.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {task.steps.length > 0 && (
              <div className="space-y-2 py-1 mb-5">
                <h4 className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest flex items-center justify-between mb-3">
                  <span>Micro-Steps Checklist</span>
                  <span className="font-normal text-[10px]">REALISTIC 15-30M ACTION ITEMS</span>
                </h4>
                {task.steps.map((step) => (
                  <div 
                    key={step.id} 
                    id={`subtask-item-${step.id}`}
                    className="flex items-center justify-between gap-3 text-sm p-3 rounded-none bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-[#18181B] dark:border-[#3F3F46] transition-colors"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-grow select-none">
                      <input
                        type="checkbox"
                        checked={step.completed}
                        onChange={() => toggleSubTask(step.id)}
                        className="rounded-none border-2 border-[#18181B] dark:border-[#3F3F46] text-[#DFE104] focus:ring-0 bg-white dark:bg-zinc-800 w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-gray-800 dark:text-zinc-100 transition-all ${step.completed ? 'line-through text-gray-400 dark:text-zinc-550 font-light' : ''}`}>
                        {step.title}
                      </span>
                    </label>
                    <span className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800 border-2 border-[#18181B] dark:border-[#3F3F46] px-2 py-0.5 rounded-none">
                      {step.duration}M
                    </span>
                  </div>
                ))}
              </div>
            )}

            {task.draft && (
              <div className="space-y-2 py-1">
                <h4 className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest flex items-center justify-between mb-2">
                  <span>ACTION DRAFT NOTEPAD (Procrastination Buster)</span>
                  <button
                    onClick={copyToClipboard}
                    className="text-[10px] font-mono font-black border-2 border-black bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-[#DFE104] hover:text-black px-2.5 py-0.5 transition-colors cursor-pointer"
                  >
                    {copiedDraft ? "COPIED!" : "COPY DRAFT"}
                  </button>
                </h4>
                <div className="relative">
                  <textarea
                    className="w-full h-48 text-xs font-mono bg-[#FFFCE8] dark:bg-zinc-950 text-[#18181B] dark:text-zinc-100 p-3.5 border-2 border-[#18181B] dark:border-[#3F3F46] focus:outline-none focus:ring-0 rounded-none leading-relaxed resize-y select-text cursor-text"
                    value={task.draft}
                    onChange={(e) => {
                      onUpdateTask({ ...task, draft: e.target.value });
                      // Save updated draft to server
                      fetch(`/api/tasks/${task.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...task, draft: e.target.value })
                      }).catch(err => console.error(err));
                    }}
                    placeholder="AI Draft Outline..."
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 uppercase">Editable notepad</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Draft Viewer Modal */}
      <AnimatePresence>
        {showDraftModal && task.draft && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4.5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-pink-500" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-50 font-display">
                      AI Execution Support Draft
                    </h3>
                    {task.draftIssuedAt && (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                        Issued: {formatDeadline(task.draftIssuedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setIsDrafting(true);
                      handleGenerateDraft();
                    }}
                    disabled={isDrafting}
                    className="p-1.5 text-gray-400 hover:text-black dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
                    title="Regenerate Draft"
                  >
                    <RefreshCw className={`w-4 h-4 ${isDrafting ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowDraftModal(false)}
                    className="p-1.5 text-gray-500 hover:text-black dark:hover:text-zinc-250 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-850 transition-colors font-semibold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-grow text-gray-800 dark:text-zinc-100 text-sm whitespace-pre-wrap font-sans leading-relaxed bg-gray-50/20 dark:bg-zinc-900/20 select-text">
                {task.draft}
              </div>

              {/* Special action bar to enhance the draft with task details */}
              <div className="px-6 py-3 bg-pink-50/60 dark:bg-pink-950/20 border-t border-b border-pink-100/60 dark:border-pink-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                  <span className="text-xs font-semibold text-pink-900 dark:text-pink-300">
                    Avoid missing raw options. Enhance with full task metrics & steps below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEnhanceDraft}
                  disabled={isDrafting}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer border-none"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Enhance with Details
                    </>
                  )}
                </button>
              </div>

              {/* Modal Footer (Regenerate / Instructions / Actions) */}
              <div className="p-4 border-t border-gray-150 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={draftPrompt}
                    onChange={(e) => setDraftPrompt(e.target.value)}
                    placeholder="Refine draft: 'make it shorter', 'add contact info'..."
                    className="flex-grow sm:w-64 text-xs bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-black dark:focus:border-zinc-500 font-sans"
                  />
                  <button
                    onClick={handleGenerateDraft}
                    disabled={isDrafting}
                    className="bg-black dark:bg-zinc-100 hover:opacity-90 dark:hover:opacity-100 dark:hover:bg-white text-white dark:text-zinc-950 px-3 py-2 text-xs rounded-lg font-medium transition-colors flex-shrink-0 cursor-pointer"
                  >
                    Apply AI Refine
                  </button>
                </div>

                <button
                  onClick={copyToClipboard}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-black dark:bg-zinc-100 hover:opacity-90 dark:hover:opacity-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 shadow-sm cursor-pointer"
                >
                  {copiedDraft ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Draft
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
