import { EmployeeProjectAssignmentStatus } from "@prisma/client";
import { getAllocationEffectiveEnd, INFINITY_DATE } from "./effective-date-helper";

export interface AllocationCandidate {
  assignmentId?: string;
  employeeId: string;
  projectId: string;
  projectPersonnelRoleId: string;
  startDate: Date;
  expectedEndDate?: Date | null;
  endDate?: Date | null;
  allocationPercentage: number;
  status: EmployeeProjectAssignmentStatus;
}

export interface AllocationCapacityResult {
  hasConflict: boolean;
  maximumCombinedAllocation: number;
  conflictStartDate?: Date;
  conflictEndDate?: Date;
  conflictingAssignments: AllocationCandidate[];
}

enum SweepEventType {
  END = 0,   // END processed BEFORE START at same timestamp
  START = 1,
}

interface SweepEvent {
  timestamp: number;
  type: SweepEventType;
  candidate: AllocationCandidate;
}

/**
 * Sweep-Line Allocation Engine (DEC-01 & DEC-07)
 * Computes peak allocation percentage over time slices for an employee's assignments.
 */
export function checkAllocationCapacity(
  existingAssignments: AllocationCandidate[],
  newCandidate: AllocationCandidate,
  referenceAt: Date = new Date()
): AllocationCapacityResult {
  // 1. Filter out candidate's own existing ID if updating, and ignore inactive statuses (RELEASED, COMPLETED, CANCELLED)
  const activeExisting = existingAssignments.filter((a) => {
    if (newCandidate.assignmentId && a.assignmentId === newCandidate.assignmentId) {
      return false;
    }
    return a.status === EmployeeProjectAssignmentStatus.ACTIVE;
  });

  const pool = [...activeExisting, newCandidate];

  // 2. Build sweep-line events
  const events: SweepEvent[] = [];

  for (const candidate of pool) {
    const startTs = candidate.startDate.getTime();
    const effectiveEnd = getAllocationEffectiveEnd({
      startDate: candidate.startDate,
      expectedEndDate: candidate.expectedEndDate,
      endDate: candidate.endDate,
      referenceAt,
    });
    const endTs = effectiveEnd.getTime();

    events.push({ timestamp: startTs, type: SweepEventType.START, candidate });
    if (endTs !== Infinity && endTs < INFINITY_DATE.getTime()) {
      events.push({ timestamp: endTs, type: SweepEventType.END, candidate });
    }
  }

  // 3. Sort events: primary by timestamp ASC, secondary by event type (END before START)
  events.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    return a.type - b.type;
  });

  // 4. Sweep line execution
  let currentAllocation = 0;
  let maxAllocation = 0;
  let activeSet: AllocationCandidate[] = [];

  let conflictDetected = false;
  let conflictStart: Date | undefined;
  let conflictEnd: Date | undefined;
  let conflicting: AllocationCandidate[] = [];

  let segmentStartTs: number | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (segmentStartTs !== null && segmentStartTs !== event.timestamp) {
      // Evaluate interval [segmentStartTs, event.timestamp)
      if (currentAllocation > maxAllocation) {
        maxAllocation = currentAllocation;
      }
      if (currentAllocation > 100 && !conflictDetected) {
        conflictDetected = true;
        conflictStart = new Date(segmentStartTs);
        conflictEnd = new Date(event.timestamp);
        conflicting = [...activeSet];
      }
    }

    if (event.type === SweepEventType.START) {
      currentAllocation += event.candidate.allocationPercentage;
      activeSet.push(event.candidate);
    } else {
      currentAllocation -= event.candidate.allocationPercentage;
      activeSet = activeSet.filter((c) => c !== event.candidate);
    }

    segmentStartTs = event.timestamp;
  }

  // Final check for ongoing interval after last event
  if (currentAllocation > maxAllocation) {
    maxAllocation = currentAllocation;
  }
  if (currentAllocation > 100 && !conflictDetected && segmentStartTs !== null) {
    conflictDetected = true;
    conflictStart = new Date(segmentStartTs);
    conflictEnd = INFINITY_DATE;
    conflicting = [...activeSet];
  }

  return {
    hasConflict: conflictDetected,
    maximumCombinedAllocation: maxAllocation,
    conflictStartDate: conflictStart,
    conflictEndDate: conflictEnd,
    conflictingAssignments: conflicting,
  };
}
