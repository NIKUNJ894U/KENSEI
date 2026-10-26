import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, Send, Square, Play, Volume2, Loader2, Sparkles, AlertCircle, HelpCircle,
  Calendar, Clock, AlertTriangle, Check, X, Briefcase, Heart, DollarSign, Home, User, Folder
} from 'lucide-react';
import { Task } from '../types';

interface VoiceIntakeProps {
  onTasksAdded: (newTasks: Task[]) => void;
}

export function VoiceIntake({ onTasksAdded }: VoiceIntakeProps) {
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [tasksToReview, setTasksToReview] = useState<Task[] | null>(null);
  const [isSavingDeadlines, setIsSavingDeadlines] = useState(false);

  const getCategoryDetails = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('work') || cat.includes('academic') || cat.includes('school') || cat.includes('study') || cat.includes('brief')) {
      return {
        icon: <Briefcase className="w-3.5 h-3.5" />,
        style: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
      };
    }
    if (cat.includes('finance') || cat.includes('bill') || cat.includes('pay') || cat.includes('money') || cat.includes('tax') || cat.includes('budget')) {
      return {
        icon: <DollarSign className="w-3.5 h-3.5" />,
        style: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
      };
    }
    if (cat.includes('health') || cat.includes('medical') || cat.includes('exercise') || cat.includes('wellness')) {
      return {
        icon: <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />,
        style: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
      };
    }
    if (cat.includes('household') || cat.includes('home') || cat.includes('house') || cat.includes('clean') || cat.includes('grocer')) {
      return {
        icon: <Home className="w-3.5 h-3.5" />,
        style: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
      };
    }
    if (cat.includes('personal') || cat.includes('self') || cat.includes('growth')) {
      return {
        icon: <User className="w-3.5 h-3.5" />,
        style: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60'
      };
    }
    return {
      icon: <Folder className="w-3.5 h-3.5" />,
      style: 'bg-slate-50 dark:bg-[#18181B] text-slate-700 dark:text-slate-400 border-slate-200 dark:border-zinc-800'
    };
  };

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

  const getLiveDueMessage = (dueDateStr: string) => {
    if (!dueDateStr) return 'No deadline set';
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffMs = due.getTime() - now.getTime();
    const absDiff = Math.abs(diffMs);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs <= 0) {
      return `⚠️ OVERDUE BY ${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;
    } else {
      return `⏳ DUE IN ${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;
    }
  };

  const calculateNewUrgencyScore = (criticality: string, dueDateStr: string) => {
    let urgencyScore = 5.0;
    if (criticality === 'critical') urgencyScore += 3.0;
    else if (criticality === 'high') urgencyScore += 1.5;
    else if (criticality === 'low') urgencyScore -= 2.0;

    const hoursRemaining = (new Date(dueDateStr).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 3) urgencyScore += 2.0;
    else if (hoursRemaining < 12) urgencyScore += 1.0;
    else if (hoursRemaining > 48) urgencyScore -= 1.0;

    return Math.min(Math.max(urgencyScore, 1.0), 10.0);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancellingRef = useRef<boolean>(false);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle standard text intake
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setProcessingStatus('Analyzing task criteria with AI...');
    
    try {
      const res = await fetch('/api/ai/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });
      if (!res.ok) throw new Error('Intake failed');
      const data = await res.json();
      setTasksToReview(data.tasks);
      setTextInput('');
    } catch (err) {
      console.error(err);
      setAudioError("Failed to parse text input. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Start browser audio recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioError(null);
    isCancellingRef.current = false;
    try {
      // Ensure the mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone API is not supported in this browser or sandbox environment. Please try the 'Simulate Speak Demo Audio' option!");
      }

      // Ask for microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Turn off microphone tracks immediately
        stream.getTracks().forEach(track => track.stop());

        if (isCancellingRef.current) {
          isCancellingRef.current = false;
          return;
        }

        // Convert chunks to single Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          await uploadAudio(base64String, 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(200); // chunk every 200ms
      setIsRecording(true);
      setRecordingSeconds(0);
      
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn("Microphone access disallowed, blocked, or not supported:", err);
      
      // If disallowed or blocked, close the mic / stop any recording state immediately
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Update UI with clear iframe and new tab guidance
      const errorMessage = "Microphone access is restricted inside the preview iframe. To use real microphone input, click the 'Open in new tab' button at the very top-right of your preview window! Alternatively, try the 'SIMULATE SPEAK DEMO AUDIO' button below to see how AI processes voice-to-schedule instantly.";
      
      setAudioError(errorMessage);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancellingRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Cancel recording without sending to AI
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancellingRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Send base64 audio data to Express Backend
  const uploadAudio = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    setProcessingStatus('Processing stream-of-consciousness audio...');
    try {
      const res = await fetch('/api/ai/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio: base64Data, 
          mimeType: mimeType 
        })
      });
      if (!res.ok) throw new Error('AI failed to process audio');
      const data = await res.json();
      setTasksToReview(data.tasks);
    } catch (err: any) {
      console.error(err);
      setAudioError(err.message || "Failed to process audio.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // High-fidelity Simulator for Demoware (When microphone is sandboxed out)
  const triggerDemoAudioStream = async () => {
    setIsProcessing(true);
    setProcessingStatus('Simulating audio stream-of-consciousness...');
    
    // 1. Wait a bit for recording simulation
    await new Promise(r => setTimeout(r, 2000));
    setProcessingStatus('AI is listening to spoken words: "I need to review the marketing brief, complete the submission tomorrow night, and pay my internet bill by tonight..."');
    
    // 2. Process text payload directly to AI to simulate true parsing
    await new Promise(r => setTimeout(r, 2000));
    setProcessingStatus('Parsing transcript into structured JSON schema...');

    try {
      const demoTranscript = "Okay, let's see. I have a chemistry report due by tomorrow at noon, and I need to buy groceries for the week because my fridge is completely empty. Oh! And I absolutely have to pay my phone bill by tonight otherwise they will suspend my lines, that's urgent. Plus, I need to schedule a meeting with team members to discuss the design guidelines on Friday morning.";
      
      const res = await fetch('/api/ai/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: demoTranscript })
      });
      const data = await res.json();
      setTasksToReview(data.tasks);
    } catch (err) {
      console.error(err);
      setAudioError("Simulation failed.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div id="ai-intake-section" className="border-2 border-black dark:border-[#3F3F46] bg-white dark:bg-[#09090B] rounded-none p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-zinc-50 font-display uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#DFE104] fill-[#DFE104]" />
            AI DYNAMIC TASK INTAKE
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            DUMP CHAOTIC THOUGHTS OR SPOKEN AUDIO. AI WILL AUTOMATICALLY STRUCTURE, SCHEDULE, AND PRIORITIZE THE STACK.
          </p>
        </div>
      </div>

      {/* Main Forms */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Text Intake */}
        <div className="md:col-span-8">
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isProcessing || isRecording}
              placeholder="e.g. 'Submit draft report by Friday noon, and renew membership tonight!'"
              className="flex-grow bg-white dark:bg-zinc-900 border-2 border-black dark:border-[#3F3F46] rounded-none px-4 py-3 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#DFE104] dark:focus:border-[#DFE104] font-mono transition-all"
            />
            <button
              id="submit-text-intake-btn"
              type="submit"
              disabled={!textInput.trim() || isProcessing || isRecording}
              className="bg-black dark:bg-[#DFE104] text-white dark:text-black border-2 border-black dark:border-black hover:bg-[#DFE104] hover:text-black hover:border-black p-3.5 rounded-none transition-all disabled:opacity-45 flex items-center justify-center flex-shrink-0 cursor-pointer"
              title="Add Task via AI"
            >
              {isProcessing && !isRecording ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Audio Intake */}
        <div className="md:col-span-4 flex flex-col gap-2">
          {!isRecording ? (
            <button
              id="start-voice-record-btn"
              onClick={startRecording}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 text-xs font-bold font-mono uppercase tracking-tight rounded-none bg-red-500 hover:bg-red-600 text-white border-2 border-black transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4 text-white animate-pulse" />
              TAP TO BRAIN-DUMP AUDIO
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                id="stop-voice-record-btn"
                onClick={stopRecording}
                className="flex-grow flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold font-mono uppercase tracking-tight rounded-none bg-red-600 text-white hover:bg-red-700 border-2 border-black transition-all cursor-pointer"
                title="Stop recording and analyze with AI"
              >
                <Square className="w-4 h-4 text-white animate-pulse" />
                <span>STOP {formatTime(recordingSeconds)}</span>
              </button>
              <button
                id="cancel-voice-record-btn"
                onClick={cancelRecording}
                className="flex-shrink-0 px-3.5 py-3.5 text-xs font-bold font-mono uppercase tracking-tight rounded-none bg-white dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border-2 border-black text-gray-700 dark:text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5"
                title="Cancel recording (discards audio)"
              >
                <X className="w-4 h-4" />
                <span>CANCEL</span>
              </button>
            </div>
          )}

          {/* Fallback Simulator Button */}
          <button
            id="trigger-demo-stream-btn"
            onClick={triggerDemoAudioStream}
            disabled={isProcessing || isRecording}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold font-mono uppercase tracking-tight rounded-none bg-gray-50 dark:bg-zinc-850 hover:bg-black hover:text-[#DFE104] dark:hover:bg-[#DFE104] dark:hover:text-black border-2 border-black dark:border-[#3F3F46] transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-indigo-500" />
            SIMULATE SPEAK DEMO AUDIO
          </button>
        </div>
      </div>

      {/* Waveform Visualization during Recording */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex flex-col items-center justify-center py-4 bg-red-50/50 dark:bg-red-950/15 border-2 border-red-500 rounded-none"
          >
            <div className="flex items-center gap-1.5 h-8">
              {[0.6, 1.2, 0.4, 1.5, 0.8, 1.9, 0.5, 1.3, 0.9, 1.6, 0.3, 1.1].map((delay, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: delay }}
                  className="w-1.5 bg-red-600 rounded-none h-3"
                />
              ))}
            </div>
            <p className="text-[11px] font-mono text-red-600 mt-2 tracking-wide uppercase font-black">
              MICROPHONE LISTENING... SPEAK ANYTHING YOU NEED TO EXECUTE.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Processing Banner */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-4 bg-white dark:bg-zinc-950 border-2 border-black dark:border-[#3F3F46] rounded-none p-4 flex items-center gap-3.5"
          >
            <Loader2 className="w-5 h-5 text-black dark:text-[#DFE104] animate-spin flex-shrink-0" />
            <div>
              <p className="text-xs font-black font-mono uppercase tracking-tight text-gray-900 dark:text-zinc-100">
                AI PIPELINE PROCESSING
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 font-mono uppercase leading-tight">
                {processingStatus}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warnings & Errors */}
      {audioError && (
        <div className="mt-4 bg-white dark:bg-zinc-900 border-2 border-red-500 rounded-none p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-xs font-black font-mono uppercase text-red-600">INTAKE PROCESSING NOTICE</p>
            <p className="text-xs text-gray-700 dark:text-zinc-400 mt-1 leading-relaxed font-sans">
              {audioError}
            </p>
          </div>
          <button 
            onClick={() => setAudioError(null)}
            className="text-gray-400 hover:text-black dark:hover:text-white p-0.5 cursor-pointer border-2 border-transparent hover:border-black rounded-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Deadline Confirmation Modal */}
      <AnimatePresence>
        {tasksToReview && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white dark:bg-zinc-950 border-4 border-black dark:border-[#3F3F46] rounded-none w-full max-w-2xl shadow-none overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="p-5 border-b-2 border-black dark:border-[#3F3F46] bg-gray-50 dark:bg-zinc-900 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-zinc-50 font-display uppercase tracking-tight flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    🚨 CONFIRM AI EXTRACTIONS
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 uppercase font-mono font-bold">
                    VERIFY OR ADJUST DEADLINES & CATEGORIES CAPTURED FROM YOUR BRAIN-DUMP.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onTasksAdded(tasksToReview);
                    setTasksToReview(null);
                  }}
                  className="text-gray-400 hover:text-black dark:hover:text-white p-1.5 rounded-none border-2 border-transparent hover:border-black transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto divide-y-2 divide-zinc-200 dark:divide-zinc-800">
                {tasksToReview.map((task, idx) => {
                  const catDetails = getCategoryDetails(task.category);
                  return (
                    <div key={task.id} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold font-display uppercase tracking-tight text-gray-900 dark:text-zinc-100">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
                          )}
                        </div>
                        {/* Category Badge */}
                        <span className={`text-[10px] font-mono tracking-tight px-2 py-1 rounded-none border-2 flex items-center gap-1 font-bold uppercase ${catDetails.style}`}>
                          {catDetails.icon}
                          {task.category}
                        </span>
                      </div>

                      {/* Calendar Picker */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-gray-50 dark:bg-zinc-900 p-4 rounded-none border-2 border-black dark:border-zinc-800">
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] font-mono text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                            Completion Deadline
                          </label>
                          <input
                            type="datetime-local"
                            value={convertToLocalDatetimeLocal(task.dueDate)}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newDateStr = val 
                                ? new Date(val).toISOString() 
                                : new Date().toISOString();
                              const updated = [...tasksToReview];
                              updated[idx] = {
                                ...task,
                                dueDate: newDateStr,
                                urgencyScore: calculateNewUrgencyScore(task.criticality, newDateStr)
                              };
                              setTasksToReview(updated);
                            }}
                            className="w-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-none px-3 py-1.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-[#DFE104] font-mono"
                          />
                        </div>
                        <div className="sm:col-span-6 flex flex-col justify-end pt-2 sm:pt-0">
                          <div className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                            Timeline Status
                          </div>
                          <div>
                            <span className={`text-xs font-mono font-black uppercase ${
                              new Date(task.dueDate).getTime() <= Date.now() 
                                ? 'text-red-500 animate-pulse' 
                                : 'text-emerald-600'
                            }`}>
                              {getLiveDueMessage(task.dueDate)}
                            </span>
                          </div>
                          <div className="text-[9px] text-gray-400 dark:text-zinc-500 font-mono mt-1 uppercase font-bold">
                            Urgency: {task.urgencyScore.toFixed(1)} ({task.criticality})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4.5 border-t-2 border-black dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex items-center justify-end gap-3">
                <button
                  onClick={() => setTasksToReview(null)}
                  className="px-4 py-2.5 text-xs font-bold font-mono uppercase tracking-tight rounded-none bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border-2 border-black dark:border-[#3F3F46] text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Discard Tasks
                </button>
                <button
                  onClick={async () => {
                    setIsSavingDeadlines(true);
                    try {
                      for (const t of tasksToReview) {
                        await fetch(`/api/tasks/${t.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            dueDate: t.dueDate,
                            urgencyScore: t.urgencyScore
                          })
                        });
                      }
                      onTasksAdded(tasksToReview);
                      setTasksToReview(null);
                    } catch (err) {
                      console.error('Failed to save updated deadlines:', err);
                      onTasksAdded(tasksToReview);
                      setTasksToReview(null);
                    } finally {
                      setIsSavingDeadlines(false);
                    }
                  }}
                  disabled={isSavingDeadlines}
                  className="px-5 py-2.5 text-xs font-bold font-mono uppercase tracking-tight rounded-none bg-[#DFE104] hover:bg-black hover:text-[#DFE104] dark:hover:bg-[#DFE104] dark:hover:text-black text-black border-2 border-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingDeadlines ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      SAVING...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      CONFIRM & PRIORITIZE
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
