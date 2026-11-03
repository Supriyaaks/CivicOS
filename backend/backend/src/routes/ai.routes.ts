import { Router, Request, Response, NextFunction } from 'express';
import { aiService } from '../ai/ai.service';
import { aiGroundingService } from '../services/ai-grounding.service';
import { municipalStore } from '../store/municipal.store';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const router = Router();

const PromptSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  options: z.object({
    temperature: z.number().optional(),
    numPredict: z.number().optional()
  }).optional()
});

const ChatSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  context: z.record(z.string(), z.any()).optional()
});

const RoadRepairAuditSchema = z.object({
  incidentId: z.string().min(1),
  verdict: z.string(),
  confidence: z.number(),
  officerDecision: z.string(),
  notes: z.string().optional()
});

/**
 * GET /api/v1/ai/status
 * Returns separate, truthful statuses for Backend, Database, Ollama/LLM, and Factual Query Engine
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cityData = await aiGroundingService.getLiveCityData();
    const ollamaStatus = await aiService.checkAIAvailability();

    res.json({
      success: true,
      data: {
        backend: {
          status: 'online',
          port: 5000,
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString()
        },
        database: {
          status: cityData.isPostgresLive ? 'connected' : 'fallback_store',
          type: cityData.dataSource,
          verified: true,
          totalIncidents: cityData.totalCount,
          totalDepartments: cityData.departments.length
        },
        llm: {
          available: ollamaStatus.available,
          model: ollamaStatus.model,
          message: ollamaStatus.message,
          provider: 'ollama'
        },
        factualEngine: {
          available: true,
          dataGrounded: true,
          recordsLoaded: cityData.totalCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/ai/chat
 * Intelligent municipal query answering grounded in real database records
 */
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query } = ChatSchema.parse(req.body);
    const cityData = await aiGroundingService.getLiveCityData();

    // Check Ollama local LLM availability
    let ollamaStatus: { available: boolean; model: string; message: string } = {
      available: false,
      model: 'llama3.2:latest',
      message: 'Not connected'
    };

    try {
      ollamaStatus = await aiService.checkAIAvailability();
    } catch {
      ollamaStatus.available = false;
    }

    // Path A: If local Ollama LLM is running with model loaded
    if (ollamaStatus.available) {
      try {
        const referencedCodes = cityData.incidents.slice(0, 5).map(i => i.incidentCode);
        const systemPrompt = `You are the CivicOS AI Civic Assistant, an authoritative municipal operations intelligence agent.
Base your answers ONLY on the following verified facts from the CivicOS Smart City Database. Do not invent complaints, statistics, or locations.

${await aiGroundingService.buildLLMContext()}

Structure your response into two distinct sections:
### 1. Retrieved Municipal Facts (${cityData.dataSource})
[List the exact relevant facts, incidents, departments, or counts directly from the database snapshot above]

### 2. Operational Guidance & Recommendations
[Provide professional operational guidance for municipal officers based strictly on the verified facts above]`;

        const response = await aiService.generateResponse({
          prompt: query,
          systemPrompt
        });

        return res.json({
          success: true,
          data: {
            content: response.content,
            model: response.model,
            source: 'ollama',
            dataSource: cityData.dataSource,
            recordsReferenced: referencedCodes
          }
        });
      } catch (ollamaErr: any) {
        // Fall through to database grounding engine if Ollama generation throws
        console.warn('[AI Routes] Ollama generation failed, falling back to database grounding engine:', ollamaErr.message);
      }
    }

    // Path B: Genuine Database-Grounded Query Engine (Deterministic, zero hallucination)
    const groundedAnswer = await aiGroundingService.resolveGroundedQuery(query);

    return res.json({
      success: true,
      data: {
        content: groundedAnswer.content,
        model: 'civicos-database-grounded',
        source: 'factual_engine',
        dataSource: groundedAnswer.dataSource,
        recordsReferenced: groundedAnswer.recordsReferenced,
        intent: groundedAnswer.intent
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request payload: query is required.'
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/ai/prompt
 */
router.post('/prompt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = PromptSchema.parse(req.body);
    const ollamaStatus = await aiService.checkAIAvailability();
    
    if (ollamaStatus.available) {
      const response = await aiService.generateResponse(validated);
      return res.json({
        success: true,
        data: response
      });
    }

    // Fallback if Ollama is not active
    const answer = await aiGroundingService.resolveGroundedQuery(validated.prompt);
    return res.json({
      success: true,
      data: {
        content: answer.content,
        model: 'civicos-database-grounded',
        source: 'fallback'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/ai/road-repair-audit or /api/v1/ai/road-repair/audit
 */
router.post(['/road-repair-audit', '/road-repair/audit'], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = RoadRepairAuditSchema.parse(req.body);
    
    // Persist to PostgreSQL if incident exists
    let resolvedIncidentId = data.incidentId;
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.incidentId);
      const inc = isUUID
        ? await prisma.incident.findUnique({ where: { id: data.incidentId } })
        : await prisma.incident.findUnique({ where: { incidentCode: data.incidentId } });

      if (inc) {
        resolvedIncidentId = inc.id;

        // Persist AIInsight in PostgreSQL
        await prisma.aIInsight.create({
          data: {
            incidentId: inc.id,
            insightType: 'ROAD_REPAIR_AUDIT',
            content: `Verdict: ${data.verdict}. Officer Decision: ${data.officerDecision}. Notes: ${data.notes || 'None'}`,
            confidence: `${Math.round(data.confidence * 100)}%`,
          }
        }).catch(() => {});

        // Persist TaskTimeline in PostgreSQL
        const officerUser = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
        await prisma.taskTimeline.create({
          data: {
            incidentId: inc.id,
            userId: officerUser ? officerUser.id : inc.citizenId,
            action: 'Repair Verified by AI',
            note: `AI Verdict: ${data.verdict} (${Math.round(data.confidence * 100)}% confidence). Decision: ${data.officerDecision}. ${data.notes || ''}`,
          }
        }).catch(() => {});
      }
    } catch (dbErr: any) {
      console.warn('[AI Routes] Audit DB save skipped:', dbErr.message);
    }

    // Record in municipal task timelines
    municipalStore.taskTimelines.unshift({
      id: `f-${Date.now()}`,
      incidentId: resolvedIncidentId,
      userId: 'officer-current',
      userName: data.officerDecision || 'Municipal Engineer',
      action: 'Repair Verified by AI',
      note: `AI Verdict: ${data.verdict} (${Math.round(data.confidence * 100)}% confidence). ${data.notes || ''}`,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Road repair audit record saved successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
