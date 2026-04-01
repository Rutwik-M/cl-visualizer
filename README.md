# 🏗️ Agent Architecture Visualizer

A static analysis and visualization tool designed to map the architecture, dependency graph, and tool-routing logic of enterprise-grade AI Agents.

---

## 📖 Overview

Modern AI CLI agents are complex distributed systems involving Model Context Protocol (MCP) servers, polymorphic tool execution, and stateful terminal rendering.

This project explores how these systems are architected at scale. By writing a custom Abstract Syntax Tree (AST) parser in Python, I extracted the behavioral metadata from a publicly exposed source map of a major AI CLI. That data is then piped into a high-performance React dashboard, transforming hundreds of isolated files into an interactive Directed Acyclic Graph (DAG).

---

## ✨ Key Features

- 🧠 **AST Metadata Extraction** — The Python backend uses deep Regex parsing to extract class names, inheritance trees (`extends BaseTool`), and public API exports, moving beyond simple file-system mapping to true Object-Oriented analysis.
- ⚡ **Dynamic DAG Layouts** — Implements the `dagre` layout engine to calculate hierarchical x/y coordinates mathematically, preventing the classic "hairball" problem common in massive graph visualizations.
- 🎛️ **Domain Toggling** — Rendering 600+ nodes simultaneously blocks the browser's main thread. This app features a Domain Filter that isolates subsystems (e.g., Core Engine vs. API Layer), recalculating the layout in milliseconds.
- 🔍 **Interactive Focus Mode** — Clicking any node instantly dims the noise and traces both incoming dependents and outgoing dependencies, color-coding the data flow.

---

## 🏗️ Technical Architecture

1. **The Backend (`build_graph.py`)** — Scans the target directory, categorizes files into 10 architectural domains (Tools, MCP, Bootloader, Engine, etc.), and extracts relationships to generate a strict `graph.json` artifact.
2. **The Frontend (`React + Vite`)** — Ingests the JSON artifact. Uses `React Flow` to manage the canvas, nodes, and edges, and `Dagre.js` to strictly enforce a Left-to-Right dependency cascade.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Rutwik-M/cl-visualizer.git
cd agent-architecture-visualizer
```

### 2. Run the React Dashboard

The repository includes a pre-compiled `graph.json` in the `public` directory for immediate viewing.

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. (Optional) Run the Python Parser

If you want to generate a new graph against a different TypeScript codebase, place the target code in a local directory, update the `SOURCE_DIRECTORY` path at the bottom of `build_graph.py`, and run:

```bash
python3 build_graph.py
```

---

## 💡 Architectural Insights Discovered

Building this visualization revealed several high-level system design patterns used in modern AI agents:

1. **The "God Class" Routing Pattern** — Almost all CLI capabilities inherit from a centralized `Tool.ts` interface, proving a highly decoupled, polymorphic command structure rather than hard-coded switch statements.
2. **Terminal as a Web App** — The architecture treats the terminal prompt like a full-blown React web application, utilizing React Ink for complex state management and interactive dialog lifecycles.
3. **MCP Abstraction** — Plugin ecosystems are not proprietary; they are directly wired into the open-source Model Context Protocol (MCP) Stdio and Remote server adapters.

---

## 🛡️ Disclaimer

- This repository contains no proprietary source code. The `graph.json` data is a mathematically abstracted structural representation derived from a publicly available source map, used strictly for educational system-design analysis and visualization research.

- This repository does not claim ownership of the original Claude Code source material.
- This repository is not affiliated with, endorsed by, or maintained by Anthropic.

---

## 👨‍💻 Author

**Rutwik Muley**

- [Connect on LinkedIn](https://www.linkedin.com/in/rutwik-muley-b20707208/)
- [View my GitHub](https://github.com/Rutwik-M)
