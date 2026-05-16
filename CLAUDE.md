# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
- Install dependencies: `cd backend && pip install -r requirements.txt`
- Run server: `cd backend && uvicorn main:app --reload --port 8000`

### Frontend
- Install dependencies: `cd frontend && npm install`
- Run development server: `cd frontend && npm run dev`

## Architecture

The project is a full-stack IPL analytics platform (CRIQ) with a clear separation between the data processing layer and the visualization layer.

### Backend (FastAPI + Pandas)
- **Core Logic**: The backend is a lightweight API layer built with FastAPI.
- **Data Handling**: Uses Pandas to process ball-by-ball cricket data stored in CSV files (`matches.csv`, `deliveries.csv`) located in `backend/data/`.
- **Entry Point**: `backend/main.py` defines the API endpoints and routing.
- **Data Access**: `backend/data.py` contains the logic for loading and querying the datasets.

### Frontend (React + Vite + TypeScript)
- **State Management**: Uses Zustand for global state management in `frontend/src/store/`.
- **Routing & Pages**: Pages are organized in `frontend/src/pages/`, which utilize shared components from `frontend/src/components/`.
- **API Integration**: API calls are abstracted in `frontend/src/api/`.
- **Visualizations**: Heavily relies on Recharts and D3 for cricket-specific analytics (wagon wheels, form charts, etc.).
- **Styling**: Uses Tailwind CSS for responsive design.
- **Proxy**: Vite is configured to proxy `/api` requests to the FastAPI backend (`http://127.0.0.1:8000`).
