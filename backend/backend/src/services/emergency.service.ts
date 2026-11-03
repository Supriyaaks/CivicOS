import { prisma } from '../utils/prisma';
import { municipalStore } from '../store/municipal.store';

export class EmergencyService {
  async getStatus() {
    let criticalIncidents: any[] = [];
    let state = municipalStore.emergencyState;

    try {
      criticalIncidents = await prisma.incident.findMany({
        where: { severity: 'Critical', status: { in: ['Pending', 'InProgress'] } }
      });

      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'emergency_state' }
      });
      if (setting && setting.value) {
        state = {
          ...state,
          ...(setting.value as any)
        };
      }
    } catch {
      criticalIncidents = municipalStore.incidents.filter(
        i => i.severity === 'Critical' && (i.status === 'Pending' || i.status === 'InProgress')
      );
    }

    // Identify high priority wards
    const wardCriticalCount: Record<string, number> = {};
    criticalIncidents.forEach(inc => {
      const wardMatch = inc.location ? inc.location.match(/Ward\s+\d+/i) : null;
      const ward = inc.ward || (wardMatch ? wardMatch[0] : 'General');
      wardCriticalCount[ward] = (wardCriticalCount[ward] || 0) + 1;
    });

    const highPriorityWards = Object.entries(wardCriticalCount).map(([ward, count]) => ({
      ward,
      criticalCount: count,
      riskLevel: 'CRITICAL',
    }));

    const responseTeams = [
      { id: 'team-roads-rapid', department: 'Roads & Infrastructure', name: 'Rapid Highway & Sinkhole Taskforce', status: 'Standby', availableUnits: 4 },
      { id: 'team-water-flood', department: 'Water and Drainage', name: 'Emergency Dewatering & High-Flow Squad', status: 'Deployed', availableUnits: 2 },
      { id: 'team-elec-hazard', department: 'Electrical Department', name: 'Grid Hazard & Live Wire Neutralization Unit', status: 'Standby', availableUnits: 3 },
      { id: 'team-traffic-divert', department: 'Traffic & Public Safety', name: 'Arterial Barricade & Evacuation Patrol', status: 'Standby', availableUnits: 5 },
    ];

    return {
      emergencyState: state,
      criticalIncidents,
      highPriorityWards,
      responseTeams,
      externalTelemetry: {
        trafficCongestionFeed: 'Unavailable (External live traffic API not connected)',
        weatherRadarStream: 'Unavailable (Person 3 external radar feed offline)',
        realtimeSensorNetwork: 'Available (CivicOS IoT telemetry node active)'
      },
      auditHistory: state.history.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    };
  }

  async toggleEmergency(data: {
    activate: boolean;
    officer: string;
    reason: string;
    severityLevel?: 'LEVEL_1_WARNING' | 'LEVEL_2_ELEVATED' | 'LEVEL_3_CRITICAL';
  }) {
    const currentState = municipalStore.emergencyState;

    if (data.activate) {
      currentState.isActive = true;
      currentState.activatedBy = data.officer || 'Emergency Command Chief';
      currentState.activatedAt = new Date();
      currentState.reason = data.reason || 'Municipal Critical Condition Declared';
      currentState.severityLevel = data.severityLevel || 'LEVEL_2_ELEVATED';

      currentState.history.push({
        id: `em-log-${Date.now()}`,
        action: 'ACTIVATED',
        officer: currentState.activatedBy,
        reason: currentState.reason,
        timestamp: new Date()
      });
    } else {
      currentState.isActive = false;
      currentState.deactivatedBy = data.officer || 'Emergency Command Chief';
      currentState.deactivatedAt = new Date();

      currentState.history.push({
        id: `em-log-${Date.now()}`,
        action: 'DEACTIVATED',
        officer: currentState.deactivatedBy,
        reason: data.reason || 'Conditions stabilized. Emergency mode stand down.',
        timestamp: new Date()
      });
    }

    try {
      await prisma.systemSettings.upsert({
        where: { key: 'emergency_state' },
        update: { value: currentState as any },
        create: { key: 'emergency_state', value: currentState as any }
      });
    } catch (err: any) {
      console.warn('[EmergencyService] Failed to persist emergency state to DB:', err.message);
    }

    return await this.getStatus();
  }
}

export const emergencyService = new EmergencyService();
