import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, Sparkles, User, Loader2, ArrowRight, Plus } from 'lucide-react';
import { Task } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const GREETINGS = (name: string) => {
  const displayName = name || 'friend';
  return [
    `Hey **${displayName}**, got deadlines? How's the day going? Let's tackle it together!`,
    `Hi **${displayName}**, hope you're keeping your cool! Got any tasks stacking up? I'm here to help. Let's organize things!`,
    `Hey **${displayName}**, ready to tame the chaos today? What's the biggest deadline on your mind?`,
    `Hello **${displayName}**! Just checking in. How are things going? Let's get those priorities straight.`,
    `Hey **${displayName}**, got a lot on your plate? No worries, let's break it down one piece at a time!`,
    `Hi **${displayName}**, is the day feeling a bit wild? Let's organize your schedule and find some focus!`,
    `Hey **${displayName}**, let's keep those deadlines at bay. What can I help you sort out right now?`,
    `Hello **${displayName}**! Ready to turn your brain-dump into an active action plan? Let's do this.`,
    `Hey **${displayName}**, hope you're having a good day! If not, let's turn it around together. What's up?`,
    `Hi **${displayName}**! Deep breath. Let's organize your day and get you back in control. What's on your mind?`
  ];
};

interface LifesaverChatbotProps {
  userName: string;
  tasks: Task[];
  onTriggerAddTask: () => void;
}

export function LifesaverChatbot({ userName, tasks, onTriggerAddTask }: LifesaverChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with a random friendly message once on mount or when userName is loaded
  useEffect(() => {
    if (messages.length === 0) {
      const greetings = GREETINGS(userName);
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: randomGreeting,
          timestamp: new Date()
        }
      ]);
    }
  }, [userName, messages.length]);

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent, presetMessage?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetMessage || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!presetMessage) setInput('');
    setIsLoading(true);

    try {
      // Map ChatMessage format to server API format
      const historyPayload = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          userName
        })
      });

      if (!res.ok) throw new Error('Chatbot request failed');
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: "Oops! My deadline emergency lines seem slightly congested right now. Try speaking to me again in a moment, or click one of the quick commands below!",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: "🚨 What should I work on first?", prompt: "Analyze my tasks. Which one is most urgent and what is the exact first step I should take?" },
    { label: "✍️ Draft update email", prompt: "Help me write a professional, high-agency update email to buy me more time on an urgent task." },
    { label: "🧘 Teach me to focus", prompt: "Suggest a micro-schedule/breathing routine for a task I have been procrastinating on." }
  ];

  const isDraggingRef = useRef(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [accumulatedOffset, setAccumulatedOffset] = useState({ x: 0, y: 0 });
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed bottom-12 right-6 z-50 pointer-events-none">
      <motion.div
        drag
        dragConstraints={{ left: -320, right: 20, top: -450, bottom: 20 }}
        dragElastic={0.15}
        dragMomentum={false}
        animate={dragOffset}
        onDragStart={() => {
          isDraggingRef.current = true;
          if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
          }
        }}
        onDragEnd={(event, info) => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);

          const nextX = accumulatedOffset.x + info.offset.x;
          const nextY = accumulatedOffset.y + info.offset.y;

          setDragOffset({ x: nextX, y: nextY });
          setAccumulatedOffset({ x: nextX, y: nextY });

          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            setDragOffset({ x: 0, y: 0 });
            setAccumulatedOffset({ x: 0, y: 0 });
          }, 12000);
        }}
        className="relative pointer-events-auto flex flex-col items-end"
        style={{ touchAction: 'none' }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 35, originX: 1, originY: 1 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 35 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute bottom-20 right-0 bg-white dark:bg-[#09090B] border-2 border-black dark:border-zinc-850 w-[380px] sm:w-[420px] h-[520px] rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(223,225,4,0.95)] flex flex-col overflow-hidden z-50"
            >
              {/* Header */}
              <div className="bg-black text-white p-4 flex items-center justify-between border-b-2 border-black dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-none bg-[#DFE104] border-2 border-black flex items-center justify-center">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wider font-mono uppercase text-white flex items-center gap-1.5">
                      LUMIO
                      <span className="inline-block w-2 h-2 bg-emerald-500 rounded-none border border-black animate-pulse" />
                    </h3>
                    <p className="text-[10px] font-mono uppercase text-[#DFE104] font-bold">Let's organize your day together.</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="text-gray-400 hover:text-white p-1 hover:bg-zinc-900 border-2 border-transparent hover:border-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div 
                ref={scrollRef}
                className="flex-grow p-4 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 space-y-4 select-text scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-none flex-shrink-0 flex items-center justify-center border-2 border-black text-[10px] font-mono font-black ${
                      msg.role === 'user' ? 'bg-[#DFE104] text-black' : 'bg-black text-white'
                    }`}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className={`rounded-none px-3.5 py-3 text-xs leading-relaxed border-2 border-black dark:border-zinc-700 ${
                      msg.role === 'user' 
                        ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-900 dark:text-indigo-200 font-mono font-bold uppercase' 
                        : 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-150'
                    }`}>
                      {/* Render basic markdown formatting with custom line-by-line list parser */}
                      {(() => {
                        const hasAddTaskAction = msg.content.includes('[SHOW_ADD_TASK_ACTION]');
                        const cleanedContent = msg.content.replace('[SHOW_ADD_TASK_ACTION]', '').trim();
                        
                        const renderFormattedText = (text: string) => {
                          return text.split('**').map((part, index) => {
                            if (index % 2 === 1) {
                              return <strong key={index} className="font-black text-black dark:text-zinc-50 uppercase tracking-tight">{part}</strong>;
                            }
                            return part.split('*').map((italicPart, iIndex) => {
                              if (iIndex % 2 === 1) {
                                  return <em key={iIndex} className="italic font-bold text-gray-500 dark:text-zinc-400">{italicPart}</em>;
                              }
                              return italicPart;
                            });
                          });
                        };

                        const lines = cleanedContent.split('\n');
                        const elements: React.ReactNode[] = [];
                        let currentListItems: React.ReactNode[] = [];
                        let listType: 'bullet' | 'ordered' | null = null;
                        let listKey = 0;

                        lines.forEach((line, li) => {
                          const trimmed = line.trim();
                          
                          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                            // If switching list types, flush the old one
                            if (listType !== 'bullet' && currentListItems.length > 0) {
                              elements.push(
                                <ul key={`list-${listKey++}`} className="my-2 space-y-1 list-disc pl-4 text-gray-800 dark:text-zinc-150">
                                  {currentListItems}
                                </ul>
                              );
                              currentListItems = [];
                            }
                            listType = 'bullet';
                            const content = trimmed.substring(2);
                            currentListItems.push(
                              <li key={li} className="text-xs">
                                {renderFormattedText(content)}
                              </li>
                            );
                          } else if (/^\d+\.\s/.test(trimmed)) {
                            // If switching list types, flush the old one
                            if (listType !== 'ordered' && currentListItems.length > 0) {
                              elements.push(
                                <ul key={`list-${listKey++}`} className="my-2 space-y-1 list-disc pl-4 text-gray-800 dark:text-zinc-150">
                                  {currentListItems}
                                </ul>
                              );
                              currentListItems = [];
                            }
                            listType = 'ordered';
                            const match = trimmed.match(/^(\d+)\.\s(.*)/);
                            const content = match ? match[2] : trimmed.substring(trimmed.indexOf('.') + 1).trim();
                            currentListItems.push(
                              <li key={li} className="text-xs">
                                {renderFormattedText(content)}
                              </li>
                            );
                          } else {
                            // Flush any ongoing list
                            if (currentListItems.length > 0) {
                              if (listType === 'bullet') {
                                elements.push(
                                  <ul key={`list-${listKey++}`} className="my-2 space-y-1 list-disc pl-4 text-gray-800 dark:text-zinc-150">
                                    {currentListItems}
                                  </ul>
                                );
                              } else {
                                elements.push(
                                  <ol key={`list-${listKey++}`} className="my-2 space-y-1 list-decimal pl-4 text-gray-800 dark:text-zinc-150">
                                    {currentListItems}
                                  </ol>
                                );
                              }
                              currentListItems = [];
                              listType = null;
                            }
                            
                            if (trimmed) {
                              elements.push(
                                <p key={li} className="mt-1 text-xs leading-relaxed text-gray-800 dark:text-zinc-150">
                                  {renderFormattedText(line)}
                                </p>
                              );
                            } else {
                              elements.push(<div key={li} className="h-2" />);
                            }
                          }
                        });

                        // Flush remaining
                        if (currentListItems.length > 0) {
                          if (listType === 'bullet') {
                            elements.push(
                              <ul key={`list-${listKey++}`} className="my-2 space-y-1 list-disc pl-4 text-gray-800 dark:text-zinc-150">
                                {currentListItems}
                              </ul>
                            );
                          } else {
                            elements.push(
                              <ol key={`list-${listKey++}`} className="my-2 space-y-1 list-decimal pl-4 text-gray-800 dark:text-zinc-150">
                                {currentListItems}
                              </ol>
                            );
                          }
                        }

                        return (
                          <div className="space-y-1">
                            {elements}
                            {hasAddTaskAction && (
                              <div className="mt-3 border-t border-dashed border-gray-200 dark:border-zinc-800 pt-3 flex flex-col items-stretch">
                                <button
                                  onClick={() => {
                                    onTriggerAddTask();
                                    setIsOpen(false);
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black font-mono uppercase bg-[#DFE104] hover:bg-yellow-400 text-black border-2 border-black dark:border-zinc-700 shadow-xs hover:shadow-sm active:translate-y-0.5 transition-all cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                  Create a New Task
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-none bg-black text-white flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-black">
                      AI
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 px-4 py-2.5 rounded-none">
                      <Loader2 className="w-4 h-4 animate-spin text-black dark:text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-950/45 border-t-2 border-black dark:border-zinc-800">
                <p className="text-[9px] font-mono font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  QUICK STRATEGIES
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((qp, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(undefined, qp.prompt)}
                      disabled={isLoading}
                      className="text-[10px] bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 hover:bg-[#DFE104] hover:text-black hover:dark:border-black text-gray-800 dark:text-zinc-150 px-2.5 py-1.5 rounded-none cursor-pointer transition-colors font-mono font-bold uppercase disabled:opacity-50"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-[#09090B] border-t-2 border-black dark:border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ASK LUMIO: 'PRIORITIZE', 'DRAFT UPDATE'..."
                  disabled={isLoading}
                  className="flex-grow bg-white dark:bg-zinc-900 border-2 border-black dark:border-[#3F3F46] rounded-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-500 focus:outline-none font-mono uppercase font-bold disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-[#DFE104] hover:bg-black hover:text-[#DFE104] dark:hover:bg-white dark:hover:text-black border-2 border-black dark:border-zinc-700 disabled:opacity-40 text-black p-2.5 rounded-none cursor-pointer transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => {
            if (isDraggingRef.current) return;
            setIsOpen(prev => !prev);
          }}
          animate={isOpen ? { rotate: 90 } : { y: [0, -8, 0] }}
          transition={isOpen ? { duration: 0.25 } : {
            y: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="ai-fab !static cursor-pointer"
          role="button"
          aria-label="Toggle Kensei assistant with Lumio"
        >
          {isOpen ? <X className="w-5.5 h-5.5 text-black" /> : "🛟"}
          {!isOpen && <div className="ai-status-dot" aria-hidden="true"></div>}
        </motion.button>
      </motion.div>
    </div>
  );
}
