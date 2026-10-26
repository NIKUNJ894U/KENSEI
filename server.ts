import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { readDB, writeDB, readDBState, writeDBState } from './src/server/db';
import { DBState, Task, SubTask } from './src/types';

// Initialize AI SDK lazily to prevent crashing if the key is missing
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Resilient wrapper to try gemini-3.5-flash first, then gemini-3.1-flash-lite
async function generateContentWithFallback(
  ai: any,
  params: {
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting AI API call with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`AI model ${model} failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All AI model attempts failed');
}

// Heuristic fallback for task intake
function localHeuristicIntake(text: string): any {
  const title = text.trim().substring(0, 50) || "New Intake Task";
  const desc = text.trim() || "Task added via emergency fallback.";
  
  let category = "Personal";
  if (/work|office|report|meeting|manager|client|project/i.test(text)) category = "Work/Academics";
  else if (/bill|finance|pay|bank|tax|credit/i.test(text)) category = "Finance";
  else if (/doctor|gym|health|workout|run|med/i.test(text)) category = "Health";
  else if (/clean|grocery|house|repair|shop/i.test(text)) category = "Household";

  return {
    parsed_tasks: [
      {
        title,
        description: desc,
        urgency_score: 7.5,
        due_date: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        action_category: category,
        criticality: "high",
        immediate_next_step: "Review details and block out time on calendar.",
        estimated_effort: "1 hour",
        draft_outline: `### 📝 ACTION BRIEF OUTLINE & NOTES\n- [ ] STEP 1: Formulate the core objectives and check outstanding parameters.\n- [ ] STEP 2: Collate primary references, contacts, or necessary resources for "${title}".\n- [ ] STEP 3: Produce the first draft output and review key specifications.`
      }
    ]
  };
}

// Heuristic fallback for deconstructing a task
function localHeuristicDeconstruct(title: string, description: string): any {
  const cleanTitle = title.toLowerCase();
  if (cleanTitle.includes('slide') || cleanTitle.includes('presentation') || cleanTitle.includes('deck')) {
    return {
      steps: [
        { title: "Outline the key narrative points & structure (Slide 1 to 5)", duration: 15 },
        { title: "Draft slide copy, key numbers, and supporting bullet points", duration: 30 },
        { title: "Apply theme colors, layout, and visual balance", duration: 20 },
        { title: "Run a full presentation dry-run & check speaker notes", duration: 15 }
      ]
    };
  } else if (cleanTitle.includes('report') || cleanTitle.includes('write') || cleanTitle.includes('essay') || cleanTitle.includes('draft')) {
    return {
      steps: [
        { title: "Create a skeleton outline with core section headings", duration: 15 },
        { title: "Draft introduction and define key conclusion first", duration: 20 },
        { title: "Write the supporting paragraphs / data analysis segments", duration: 30 },
        { title: "Proofread for tone clarity, spelling, and references", duration: 15 }
      ]
    };
  } else if (cleanTitle.includes('email') || cleanTitle.includes('reply') || cleanTitle.includes('message') || cleanTitle.includes('slack')) {
    return {
      steps: [
        { title: "Review recipient context & main action point needed", duration: 10 },
        { title: "Draft a concise, high-agency message template", duration: 15 },
        { title: "Double check spelling of names and attachments", duration: 10 },
        { title: "Send message and flag for follow-up if no reply", duration: 10 }
      ]
    };
  } else if (cleanTitle.includes('pay') || cleanTitle.includes('bill') || cleanTitle.includes('tax') || cleanTitle.includes('finance')) {
    return {
      steps: [
        { title: "Gather invoice details, account numbers, and billing statements", duration: 10 },
        { title: "Log into secure payment portal or banking app", duration: 15 },
        { title: "Verify transaction amount, confirmation details, and account balance", duration: 15 },
        { title: "Save confirmation PDF/receipt and update budget logs", duration: 10 }
      ]
    };
  } else {
    return {
      steps: [
        { title: `Prepare workspace, quiet environment, and block out notifications`, duration: 15 },
        { title: `Review core requirements for task: "${title}"`, duration: 20 },
        { title: "Draft initial rough copy / baseline framework", duration: 30 },
        { title: "Refine, edit, and complete final submission check", duration: 15 }
      ]
    };
  }
}

// Heuristic fallback for draft generation
function localHeuristicDraft(title: string, description: string, userName: string, customInstruction?: string): string {
  const customStr = customInstruction ? `\n(Note requested: ${customInstruction})` : "";
  const cleanTitle = title.toLowerCase();

  if (cleanTitle.includes('email') || cleanTitle.includes('reply') || cleanTitle.includes('message') || cleanTitle.includes('slack')) {
    return `Subject: Response regarding ${title}

Dear Team / Recipient,

I hope you are doing well.

I am writing to provide a quick update regarding ${title}. 

${description || "I am currently working on this and expect to have everything completed shortly. Please let me know if you have any questions or require any immediate information in the meantime."}

Best regards,
${userName || "User"}
${customStr}`;
  } else if (cleanTitle.includes('slide') || cleanTitle.includes('presentation') || cleanTitle.includes('deck')) {
    return `# Presentation Outline: ${title}
Author: ${userName || "User"}
${customStr}

## Slide 1: Title & Core Value Proposition
- Title: ${title}
- Subtitle: Addressing critical bottlenecks and rapid execution steps.

## Slide 2: The Core Problem
- What we are trying to solve: ${description || "Key requirements and objectives."}
- Why it matters: Impact of delayed execution vs rapid response.

## Slide 3: Proposed Strategy & Actions
- Step 1: Immediate low-friction interventions.
- Step 2: Key milestones and timeline outline.

## Slide 4: Results & Expected Outcomes
- Deliverable checklist.
- Next milestones.`;
  } else {
    return `# Execution Plan & Blueprint: ${title}
Prepared by: ${userName || "User"}
Context: ${description || "Emergency draft compiled via backup fallback system."}
${customStr}

## 1. Objectives
- Clear completion of: ${title}
- Focus on fast, frictionless steps.

## 2. Key Action Items
- [ ] Review initial draft guidelines
- [ ] Implement core solution skeleton
- [ ] Conduct final quality check

## 3. Communication Template
"Hi all, I'm wrapping up the work on ${title} and will share the final deliverables by the deadline. Thanks for your patience!"`;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a higher limit for JSON payloads to accommodate base64 audio recordings
  app.use(express.json({ limit: '50mb' }));

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Helper to get user partition key from headers or cookies
  const getUserKey = (req: any) => {
    const headerEmail = req.headers['x-user-email'] as string;
    if (headerEmail) return headerEmail;

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|; )google_user_email=([^;]*)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return 'guest';
  };

  // ----------------- API ROUTES -----------------

  // Get tasks
  app.get('/api/tasks', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      res.json(partition.tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read tasks' });
    }
  });

  // Create task
  app.post('/api/tasks', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      const newTask: Task = {
        id: 'task-' + generateId(),
        title: req.body.title || 'Untitled Task',
        description: req.body.description || '',
        urgencyScore: req.body.urgencyScore || 5.0,
        dueDate: req.body.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        category: req.body.category || 'General',
        criticality: req.body.criticality || 'medium',
        estimatedEffort: req.body.estimatedEffort || '30 mins',
        immediateNextStep: req.body.immediateNextStep || 'Identify first action.',
        completed: false,
        createdAt: new Date().toISOString(),
        steps: req.body.steps || [],
        draft: null,
        focusBlocks: [],
        tags: req.body.tags || []
      };
      partition.tasks.unshift(newTask);
      writeDBState(userKey, partition);
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update task
  app.put('/api/tasks/:id', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      const taskIndex = partition.tasks.findIndex(t => t.id === req.params.id);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const updatedTask = {
        ...partition.tasks[taskIndex],
        ...req.body
      };

      partition.tasks[taskIndex] = updatedTask;
      writeDBState(userKey, partition);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete task
  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      const initialLength = partition.tasks.length;
      partition.tasks = partition.tasks.filter(t => t.id !== req.params.id);
      if (partition.tasks.length === initialLength) {
        return res.status(404).json({ error: 'Task not found' });
      }
      writeDBState(userKey, partition);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // Reset all tasks
  app.post('/api/tasks/reset', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      partition.tasks = [];
      writeDBState(userKey, partition);
      res.json({ success: true, tasks: [] });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset tasks' });
    }
  });

  // Get User Profile
  app.get('/api/profile', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      res.json(partition.profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read profile' });
    }
  });

  // Update User Profile
  app.post('/api/profile', (req, res) => {
    try {
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      partition.profile = {
        ...partition.profile,
        ...req.body
      };
      writeDBState(userKey, partition);
      res.json(partition.profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // AI Intake (Text or Audio)
  app.post('/api/ai/intake', async (req, res) => {
    try {
      const ai = getAIClient();
      const { text, audio, mimeType } = req.body;
      let prompt = "Parse the following task details and output a structured list of tasks.\n";

      const contents: any[] = [];

      if (audio && mimeType) {
        // Voice-Enabled Briefing & Intake
        contents.push({
          inlineData: {
            data: audio, // base64 data
            mimeType: mimeType
          }
        });
        prompt += `This is an audio brain-dump where the user speaks in a chaotic stream-of-consciousness. Carefully listen to the speech, extract all mentioned tasks, estimate appropriate deadlines (relative to now), set a sensible category, assign an urgency score from 1.0 to 10.0 based on real consequences, and propose a concrete 'immediate next step' for each task.\n\nCRITICAL: The current actual date and time is: ${new Date().toString()} (${new Date().toISOString()}). All relative expressions (like "in 20 minutes", "today", "tonight", "tomorrow", "this Friday") MUST be calculated precisely relative to this current date-time. Make sure to output due_date with the correct year, month, day, and hour.`;
      } else if (text) {
        prompt += `User Input: "${text}"\nExtract tasks, deadlines, criticality, effort, and immediate next steps.\n\nCRITICAL: The current actual date and time is: ${new Date().toString()} (${new Date().toISOString()}). All relative expressions (like "in 20 minutes", "today", "tonight", "tomorrow", "this Friday") MUST be calculated precisely relative to this current date-time. Make sure to output due_date with the correct year, month, day, and hour.`;
      } else {
        return res.status(400).json({ error: 'Either text or audio is required' });
      }

      contents.push({ text: prompt });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          parsed_tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Clear, descriptive title of the task" },
                description: { type: Type.STRING, description: "Summary of details, goals, or notes mentioned" },
                urgency_score: { type: Type.NUMBER, description: "Urgency scale (1.0 to 10.0) based on consequence of missing it" },
                due_date: { type: Type.STRING, description: "ISO 8601 DateTime string. Infer or estimate a realistic deadline relative to the current local time: " + new Date().toISOString() },
                action_category: { type: Type.STRING, description: "Category of action, e.g. Finance, Work/Academics, Health, Household, Personal" },
                criticality: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                immediate_next_step: { type: Type.STRING, description: "The single, highly specific immediate physical action to start on right now" },
                estimated_effort: { type: Type.STRING, description: "Realistic effort estimation, e.g. '15 mins', '1 hour', '3 hours'" },
                draft_outline: { type: Type.STRING, description: "A highly specific, detailed 3-bullet action starting outline, memo draft, email draft, or checklist template to start this task without a blank page." }
              },
              required: ["title", "description", "urgency_score", "due_date", "action_category", "criticality", "immediate_next_step", "estimated_effort", "draft_outline"]
            }
          }
        },
        required: ["parsed_tasks"]
      };

      let parsedData: any = null;

      if (ai) {
        try {
          const aiResponse = await generateContentWithFallback(ai, {
            contents,
            config: {
              systemInstruction: 'You are the core intelligence engine of "The Last-Minute Life Saver". Your goal is to prevent users from missing deadlines by being proactive, realistic, and highly actionable. You parse incoming chaotic requests (both spoken stream-of-consciousness and messy text lists) into beautifully organized, discrete, highly actionable task entries. Always provide immediate next steps and dynamic drafts.',
              responseMimeType: 'application/json',
              responseSchema
            }
          });

          const resultText = aiResponse.text;
          if (resultText) {
            parsedData = JSON.parse(resultText);
          }
        } catch (apiError) {
          console.warn('AI API failed in Intake, falling back to heuristics:', apiError);
        }
      } else {
        console.warn('No AI client available for Intake, using local heuristics.');
      }

      if (!parsedData) {
        parsedData = localHeuristicIntake(text || "Spoken brain-dump recording (Lifesaver fallback)");
      }

      const parsedTasksList = parsedData.parsed_tasks || [];

      // Save extracted tasks to database
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      const addedTasks: Task[] = [];

      for (const t of parsedTasksList) {
        const newTask: Task = {
          id: 'task-' + generateId(),
          title: t.title,
          description: t.description,
          urgencyScore: Number(t.urgency_score) || 5.0,
          dueDate: t.due_date,
          category: t.action_category,
          criticality: t.criticality,
          estimatedEffort: t.estimated_effort,
          immediateNextStep: t.immediate_next_step,
          completed: false,
          createdAt: new Date().toISOString(),
          steps: [],
          draft: t.draft_outline || null,
          draftIssuedAt: t.draft_outline ? new Date().toISOString() : undefined,
          focusBlocks: []
        };
        partition.tasks.unshift(newTask);
        addedTasks.push(newTask);
      }

      writeDBState(userKey, partition);
      res.json({ success: true, tasks: addedTasks });
    } catch (error: any) {
      console.error('AI Intake error:', error);
      res.status(500).json({ error: error.message || 'AI Intake failed' });
    }
  });

  // AI Task Deconstruction (Break down into micro-steps)
  app.post('/api/tasks/:id/deconstruct', async (req, res) => {
    try {
      const ai = getAIClient();
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      const task = partition.tasks.find(t => t.id === req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const prompt = `Break down this high-friction, overwhelming task into clear, bite-sized 15-30 minute micro-steps:
Task: "${task.title}"
Description: "${task.description}"
Criticality: "${task.criticality}"
Estimated Effort: "${task.estimatedEffort}"

Provide a logical sequence of micro-steps. Each step should represent a single direct physical action, strictly timed between 10 and 45 minutes.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "A concrete, specific, and actionable physical step. Include tools if relevant (e.g. 'Log into Bank of America portal')" },
                duration: { type: Type.INTEGER, description: "Estimated duration in minutes (between 10 and 45)" }
              },
              required: ["title", "duration"]
            }
          }
        },
        required: ["steps"]
      };

      let parsed: any = null;

      if (ai) {
        try {
          const aiResponse = await generateContentWithFallback(ai, {
            contents: prompt,
            config: {
              systemInstruction: 'You are the "Deconstruction Engine" for "The Last-Minute Life Saver". You take overwhelming tasks and split them into realistic, frictionless, hyper-specific 15-30 minute micro-steps. You never suggest vague goals; you suggest physical, concrete actions.',
              responseMimeType: 'application/json',
              responseSchema
            }
          });

          const resultText = aiResponse.text;
          if (resultText) {
            parsed = JSON.parse(resultText);
          }
        } catch (apiError) {
          console.warn('AI API deconstruction failed, falling back to local heuristics:', apiError);
        }
      } else {
        console.warn('AI API client not configured, using local deconstruction heuristics.');
      }

      if (!parsed) {
        parsed = localHeuristicDeconstruct(task.title, task.description);
      }

      const generatedSteps = (parsed.steps || []).map((s: any) => ({
        id: 'step-' + generateId(),
        title: s.title,
        duration: s.duration,
        completed: false
      }));

      // Update the task in DB
      task.steps = generatedSteps;
      
      // Update immediate next step with the first step
      if (generatedSteps.length > 0) {
        task.immediateNextStep = generatedSteps[0].title;
      }

      writeDBState(userKey, partition);
      res.json(task);
    } catch (error: any) {
      console.error('AI Deconstruction error:', error);
      res.status(500).json({ error: error.message || 'AI Deconstruction failed' });
    }
  });

  // AI "Draft It For Me" (Execution Support)
  app.post('/api/tasks/:id/draft', async (req, res) => {
    try {
      const ai = getAIClient();
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);
      const task = partition.tasks.find(t => t.id === req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { customInstruction } = req.body;
      const userName = partition.profile.name;

      const prompt = `Write a premium, high-agency first draft or template that would complete or assist in completing the following task:
Task: "${task.title}"
Context: "${task.description}"
Category: "${task.category}"
User Name: "${userName}"
${customInstruction ? `Specific formatting or content request: "${customInstruction}"` : ""}

If it is a professional email, draft the email clearly with Subject and Body. If it is a personal text/message, draft the message. If it is a project outline or simple spreadsheet template mock, draft that. Ensure it is highly professional, realistic, and immediately usable with minimal fill-in-the-blank brackets.`;

      let draftText = '';

      if (ai) {
        try {
          const aiResponse = await generateContentWithFallback(ai, {
            contents: prompt,
            config: {
              systemInstruction: 'You are the "Draft It For Me" writing assistant for "The Last-Minute Life Saver". You write top-tier professional emails, slack updates, project outlines, and message responses. Your copy is clean, concise, persuasive, and completely ready to send, requiring almost zero polishing from the user.'
            }
          });

          if (aiResponse && aiResponse.text) {
            draftText = aiResponse.text;
          }
        } catch (apiError) {
          console.warn('AI API draft generation failed, falling back to local heuristics:', apiError);
        }
      } else {
        console.warn('AI API client not configured, using local drafting heuristics.');
      }

      if (!draftText) {
        draftText = localHeuristicDraft(task.title, task.description, userName, customInstruction);
      }

      // Update in DB
      task.draft = draftText;
      task.draftIssuedAt = new Date().toISOString();
      writeDBState(userKey, partition);

      res.json({ draft: draftText, draftIssuedAt: task.draftIssuedAt });
    } catch (error: any) {
      console.error('AI Draft error:', error);
      res.status(500).json({ error: error.message || 'AI Draft generation failed' });
    }
  });

  // AI Conversational Chatbot
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const ai = getAIClient();
      const { message, history, userName } = req.body;
      const userKey = getUserKey(req);
      const partition = readDBState(userKey);

      const tasksContext = partition.tasks.map(t => ({
        title: t.title,
        description: t.description,
        urgencyScore: t.urgencyScore,
        dueDate: t.dueDate,
        category: t.category,
        criticality: t.criticality,
        immediateNextStep: t.immediateNextStep,
        completed: t.completed,
        steps: t.steps.map(s => `${s.title} (${s.duration}m, ${s.completed ? 'completed' : 'pending'})`)
      }));

      const systemInstruction = `You are "Lumio" - the friendly, premium, witty, and highly strategic assistant for the app "Kensei" (previously known as The Last-Minute Life Saver).
Your goal is to rescue the user from procrastination, overwhelm, and impending deadlines.
The user's name is "${userName || 'User'}".
Here is the user's current task stack for context:
${JSON.stringify(tasksContext, null, 2)}

CRITICAL REQUIREMENT: If ALL tasks in the user's task stack are marked as completed (completed is true, or the stack is empty), you MUST warmly congratulate the user, state clearly that all tasks are completed and they are fully caught up (e.g. "Your tasks are completed! Got a new one?"), and offer to help them set up a new goal. Do NOT hallucinate any pending tasks or suggest working on already completed ones. If and only if all tasks are completed, you MUST append the exact text '[SHOW_ADD_TASK_ACTION]' on a separate line at the very end of your message so the application can render a quick task creator button. If there is even one uncompleted task, do NOT append that tag, and instead focus on guiding them on that pending task.

Be empathetic but incredibly direct. Help them prioritize, draft emails, break down terrifying tasks, suggest focus schedules, or write outlines. Focus purely on immediate, low-friction next physical steps. Always be encouraging but highly practical. Encourage them to sync schedules to Google Calendar or email action briefings to their inbox if they need extra focus accountability. Keep your answers relatively brief, punchy, and highly scannable (use bolding and clear lists).`;

      let replyText = "";

      if (ai) {
        try {
          // Format contents with history
          const contents = [
            ...(history || []).map((msg: any) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ];

          const aiResponse = await generateContentWithFallback(ai, {
            contents,
            config: {
              systemInstruction
            }
          });

          if (aiResponse && aiResponse.text) {
            replyText = aiResponse.text;
          }
        } catch (apiError) {
          console.warn('AI API chat failed, falling back to heuristics:', apiError);
        }
      }

      if (!replyText) {
        // Smart contextual fallback engine if Gemini is unavailable
        const pendingTasks = partition.tasks.filter(t => !t.completed);
        const sortedTasks = [...pendingTasks].sort((a, b) => b.urgencyScore - a.urgencyScore);
        const topTask = sortedTasks[0];
        const lowerMessage = message.toLowerCase();

        if (pendingTasks.length === 0) {
          replyText = `**Amazing job, ${userName || 'User'}!** All your tasks are fully completed and you are absolutely caught up. 🥂\n\nNo pending actions are looming on your horizon. What would you like to execute next? Click the button below to add a new objective!\n[SHOW_ADD_TASK_ACTION]`;
        } else if (lowerMessage.includes('priorit') || lowerMessage.includes('urgent') || lowerMessage.includes('first') || lowerMessage.includes('work on')) {
          replyText = `Hey **${userName || 'User'}**, let's look at your stack. You have **${pendingTasks.length} pending tasks** right now. \n\nAccording to my calculations, your absolute **highest priority** is:\n\n### 🚨 **${topTask.title}** (Urgency: **${topTask.urgencyScore.toFixed(1)}/10.0**)\n* **Immediate Next Step:** ${topTask.immediateNextStep || 'Break ground on this task.'}\n* **Category:** *${topTask.category || 'General'}*\n\n**My recommendation:** Stop worrying about the rest of the stack. Spend the next **15 minutes** focused *only* on that immediate next step. I've got your back!`;
        } else if (lowerMessage.includes('draft') || lowerMessage.includes('email') || lowerMessage.includes('write')) {
          const draftTarget = topTask || { title: "my urgent deadline", immediateNextStep: "finishing up details" };
          replyText = `Here is a high-agency, professional email draft to buy you more time on your task: **"${draftTarget.title}"**:\n\n\`\`\`\nSubject: UPDATE: Status of ${draftTarget.title}\n\nHi team,\n\nI wanted to provide a proactive brief regarding my progress on "${draftTarget.title}". \n\nI am currently finalizing the crucial elements, specifically focused on ${draftTarget.immediateNextStep}. To ensure the high level of execution and detail required, I will be wrapping this up within the next few hours.\n\nThank you for your trust and support as I bring this over the finish line.\n\nBest,\n${userName || 'User'}\n\`\`\`\n\n*Copy this draft, send it out, and protect your schedule!*`;
        } else if (lowerMessage.includes('focus') || lowerMessage.includes('breathe') || lowerMessage.includes('schedule') || lowerMessage.includes('procrastinat')) {
          replyText = `Let's break the cycle of procrastination right now, **${userName || 'User'}**! Take a deep, slow breath. 🧘\n\nHere is a custom **Micro-Focus Schedule** built specifically for your top task **"${topTask.title}"**:\n\n1. **Minute 0–15 (The Execution Sprint):** Work *exclusively* on: *"${topTask.immediateNextStep}"*. Zero tabs open except this.\n2. **Minute 15–20 (Visual Audit):** Review what you've done, update any steps, and congratulate yourself.\n3. **Minute 20–25 (Quick Stretch):** Stand up, drink a glass of water, and do some light breathing exercises.\n\n*Pro-tip: Try enabling Google Calendar integration inside Profile Settings to sync focus blocks directly and protect your time slots!*`;
        } else {
          // General rescue briefing
          const listStr = sortedTasks.slice(0, 3).map(t => `* **${t.title}** (Urgency: ${t.urgencyScore.toFixed(1)}/10) - Step: *${t.immediateNextStep || 'Get started'}*`).join('\n');
          replyText = `Hey **${userName || 'User'}**, Lumio here! I'm operating on backup heuristics right now, but I have a perfect view of your stack. 🛟\n\nHere is your immediate emergency rescue briefing:\n\n${listStr}\n\nWhat are you feeling most overwhelmed by? Ask me to: **"PRIORITIZE"** my stack, **"DRAFT AN EMAIL"** to buy time, or suggest a **"FOCUS ROUTINE"**!`;
        }
      }

      res.json({ reply: replyText });
    } catch (error: any) {
      console.error('AI Chat error:', error);
      res.status(500).json({ error: error.message || 'AI Chat failed' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Last-Minute Life Saver server is running on http://localhost:${PORT}`);
  });
}

startServer();
