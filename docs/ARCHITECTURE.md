# Application Architecture Overview

This document summarizes the current structure of the Real Data Intelligence app to help onboarding and future development.

## Entry Points and Layout
- **index.tsx** mounts `<App />` under React Strict Mode and pulls global styles from `index.css`. The app renders into the `#root` element created by Vite. 
- **App.tsx** orchestrates high-level navigation. It switches between the landing dashboard and the project workspace via `AppView` state. When a project is active it wraps the workspace with `ToastProvider`, renders the `Sidebar` for navigation, and swaps step views based on `ProjectTab` (upload, prep, visualize, AI agent, report, settings). It also persists tab selections and project context with `saveLastState`.

## Landing Experience
- **views/Landing.tsx** provides the dashboard-style landing page. It loads projects from IndexedDB, calculates stats, and offers project creation/deletion. The left rail uses Lucide icons and supports collapsing. Selecting a project triggers `onSelectProject` so `App` can enter the workspace flow.

## Workspace Navigation
- **components/Sidebar.tsx** renders the project navigation rail for the active workspace. It keeps its own collapse state and drives the active `ProjectTab` while offering a shortcut back to the landing screen. Menu items map to each workflow stage (ingestion through reporting and settings) and visually highlight the current step.

## Workflow Views
- **views/DataIngest.tsx** handles data import. It supports drag-and-drop or URL-based CSV ingestion using helpers from `utils/excel`, infers columns, updates the project record, and persists through `saveProject` while surfacing status via the toast system.
- **views/DataPrep.tsx** manages cleaning and transformation. It maintains separate "clean" and "build" modes, tracks transformation rules, and uses utilities like `applyTransformation`, `analyzeSourceColumn`, and `exportToExcel` to reshape data before saving updates to the project.
- Additional workflow screens (`views/Analytics.tsx`, `views/AiAgent.tsx`, `views/ReportBuilder.tsx`, and `views/Settings.tsx`) plug into the same tabbed layout and receive the active project plus update callbacks from `App`.

## Shared Components and Utilities
- **components/** contains reusable UI such as `ToastProvider` (notifications), `Skeleton` (loading placeholders), `EmptyState`, `TableColumnFilter`, and `ChartBuilder`. These pieces supply consistent styling and behavior across views.
- **utils/storage.ts** abstracts persistence via IndexedDB for project CRUD plus lightweight tab-state tracking in `localStorage`. It centralizes DB versioning and object-store creation.
- **types.ts** defines shared enums (`AppView`, `ProjectTab`, `AIProvider`) and structures for projects, AI settings, transformations, dashboards, and the report builder. Many components import from here to keep data contracts consistent.

## Data Flow Summary
1. Landing loads projects from IndexedDB and lets users create a new `Project` skeleton.
2. Selecting a project moves the app into workspace mode where `Sidebar` and step views render.
3. Each step view mutates the project (e.g., ingest data rows, add transform rules) and calls `saveProject` to persist. The `App` state reflects updates so subsequent steps operate on the latest project snapshot.
4. Tab changes are remembered through `saveLastState`, allowing the UI to restore the previous position on reload.
