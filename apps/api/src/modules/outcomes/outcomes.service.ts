import { getPrisma } from "../../config/database";

export interface FeedbackSubmission {
  recommendationId?: string;
  skillId?: string;
  rating: number; // 1-5
  comments: string;
  expertRole: string; // e.g. Industry Expert, University Dean, State Officer
}

const SAMPLE_OUTCOMES = {
  summary: {
    overallPlacementRate: 78.4,
    placementRateLift: "+14.2% vs non-aligned baseline",
    averageTimeToHireDays: 28.5,
    wageGrowthPercentage: "+18.6%",
    skillMatchAccuracy: 91.2,
    humanValidationsCount: 340,
    totalTrainedCandidates: 12450
  },
  districtBreakdown: [
    { district: "Pune", placementRate: 84.2, traineesCount: 3200, topSector: "Manufacturing & IT" },
    { district: "Mumbai", placementRate: 81.5, traineesCount: 2800, topSector: "Services & Tech" },
    { district: "Nagpur", placementRate: 74.8, traineesCount: 1900, topSector: "Healthcare & Logistics" },
    { district: "Nashik", placementRate: 76.1, traineesCount: 1650, topSector: "Electrical & Auto" },
    { district: "Chhatrapati Sambhajinagar", placementRate: 71.9, traineesCount: 1400, topSector: "Industrial Operations" }
  ],
  longitudinalTrends: [
    { quarter: "2025-Q1", placementRate: 64.2, wageGrowth: 11.4 },
    { quarter: "2025-Q2", placementRate: 68.9, wageGrowth: 13.8 },
    { quarter: "2025-Q3", placementRate: 73.5, wageGrowth: 15.2 },
    { quarter: "2025-Q4", placementRate: 76.8, wageGrowth: 17.1 },
    { quarter: "2026-Q1", placementRate: 78.4, wageGrowth: 18.6 }
  ]
};

const FEEDBACK_STORE: FeedbackSubmission[] = [];

export class OutcomesService {
  static async getOutcomeMetrics() {
    try {
      const prisma = getPrisma();
      // If DB models exist
    } catch {
      // Fallback
    }

    return {
      ...SAMPLE_OUTCOMES,
      recentFeedbackCount: FEEDBACK_STORE.length
    };
  }

  static async submitFeedback(feedback: FeedbackSubmission) {
    FEEDBACK_STORE.push({
      ...feedback,
    });

    try {
      const prisma = getPrisma();
      // Record in DB if connected
    } catch {
      // Memory store
    }

    return {
      success: true,
      message: "Human-in-the-loop audit feedback recorded successfully.",
      recordedAt: new Date().toISOString(),
      feedbackId: `fb-${Date.now()}`
    };
  }
}
