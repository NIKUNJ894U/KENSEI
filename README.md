# Kensei
## Master your flow, conquer your backlog.

### About
Kensei is a focused task management platform designed for professionals and creators who need to minimize cognitive load and maximize productivity. By combining rapid voice-based task entry, intelligent stress-level prioritization, and comprehensive visual analytics, Kensei transforms overwhelming backlogs into clear, actionable paths.

### Core Features
*   **Intelligent Prioritization**: Kensei calculates a real-time "Stress Index" for your task list, factoring in urgency, deadlines, and task load to highlight exactly what requires your immediate attention.
*   **Rapid Voice Intake**: Capture tasks instantly using natural language via our voice-to-action engine, keeping you in the flow without needing to manually type details.
*   **Visual Analytics Dashboard**:
    *   **Consistency Heatmap**: A dedicated monthly view to track your daily progress and maintain positive productivity streaks.
    *   **Velocity Charts**: Dynamic visual representations of task creation versus completion trends over time, providing insights into your personal work rhythm.
*   **Immersive & Distraction-Free UI**: Built with a high-contrast, tech-inspired design language. The interface features subtle, interactive grid backgrounds that react to your task load and hover states, keeping you engaged while maintaining focus.

### Tech Stack
Kensei is built for a robust, high-performance full-stack experience:

#### Frontend
*   **React**: Core library for UI components.
*   **Vite**: Build tool for fast development and bundling.
*   **TypeScript**: Ensures type safety across the entire application.
*   **Tailwind CSS**: Utility-first CSS framework for polished styling.
*   **Motion**: Handles fluid, micro-interactions and animations.
*   **Recharts**: Powers the dynamic data visualization and velocity charts.
*   **Lucide React**: Provides consistent, high-quality iconography.

#### Backend & Data
*   **Node.js/Express**: Provides a reliable, scalable server-side environment.
*   **Firebase**:
    *   **Firestore**: Serves as the primary cloud database for real-time, synced task state management.
    *   **Authentication**: Manages secure user authentication via Google.

#### Intelligence & AI
*   **Google Gemini API**: Powers the voice-to-task parsing engine, task deconstruction, draft generation, and the intelligent conversational chatbot (Lumio).
