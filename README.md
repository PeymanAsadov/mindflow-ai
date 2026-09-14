# MindFlow AI 🧠✨

An AI-powered personal memory assistant and dashboard that captures tasks, meetings, projects, and notes via a Telegram bot, structures them automatically, and lets you query your entire knowledge base using natural language.

---

## 🚀 Features

* **Telegram Bot Integration:** Automatically syncs tasks, todos, meetings, notes, and project data straight from Telegram messages.
* **Ask Mind (AI Assistant):** Query your personal memory using natural language prompts to find specific notes, tasks, or appointment details instantly.
* **Smart Dashboard:** Clean, modern UI displaying daily AI summaries, sync statuses, and quick navigation categories.
* **Dynamic Routing & Layout:** Built with `react-router-dom` utilizing a responsive layout, smooth page transitions, and auto-scroll behaviors.
* **State Management & Syncing:** Real-time data updates across components via local storage event listeners and context providers.

---

## 🛠️ Tech Stack

### Frontend
* **React & Vite** – Fast component-based user interface development.
* **Tailwind CSS** – Utility-first styling for responsive and modern UI layout.
* **React Router Dom** – Seamless single-page application navigation and page transitions.
* **Lucide React** – Clean vector icons.
* **Axios** – HTTP client for backend communication.

### Backend & Cloud
* **Node.js / Express / NestJS** – Robust backend services handling API endpoints and database operations.
* **Railway** – Cloud deployment platform hosting the production backend (`https://backend-production-4d2a.up.railway.app`).
* **Google OAuth** – Secure user authentication workflow.

---

👤 Author

* **Name**: Peyman Asadov
* **Email**: peymanasadovv@gmail.com
* **GitHub**: [PeymanAsadov](https://github.com/PeymanAsadov)
* **LinkedIn**: [Peyman Asadov](https://www.linkedin.com/in/peyman-asadov-42a8b8416)

---

## 📂 Project Structure

```Mindflow
mindflow-ai/
├── public/              # Static assets and public files
├── src/
│   ├── components/      # Reusable UI components (Sidebar, TodoList, Projects, etc.)
│   ├── page/            # Main application pages (Dashboard, Calendar, etc.)
│   ├── services/        # API integration handlers (api.js)
│   ├── utils/           # Helper scripts (storage management, synced data hooks)
│   ├── App.jsx          # Root component and router configuration
│   ├── Layout.jsx       # Main layout wrapper with sidebar and page transitions
│   └── UserContext.jsx  # Global user state management provider
├── package.json
└── README.md
