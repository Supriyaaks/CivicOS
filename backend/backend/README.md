# CivicOS Backend

Backend API for the CivicOS project.

## Tech Stack
- Node.js, Express, TypeScript
- Prisma ORM, PostgreSQL
- Zod for validation

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure DATABASE_URL.
3. Run migrations: `npx prisma migrate dev`
4. Start server: `npm run dev`

## AI Integration
CivicOS uses a local Ollama instance for its intelligence features.

### Setup
1. Install [Ollama](https://ollama.com/).
2. Pull the required model: `ollama pull llama3.2:latest`
3. Ensure Ollama is running in the background.

### Testing
Run the AI connectivity test:
`npm run test:ai`
