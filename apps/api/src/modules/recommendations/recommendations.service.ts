import { getPrisma } from "../../config/database";

export interface RecommendationQueryFilter {
  targetRole?: string; // POLICYMAKER, UNIVERSITY, STUDENT, EMPLOYER
  domain?: string;
  minConfidence?: number;
}

const SAMPLE_RECOMMENDATIONS = [
  {
    id: "reco-pol-101",
    targetRole: "POLICYMAKER",
    title: "Incentivize Electric Vehicle & Industrial Automation Apprenticeships in Pune-Chakan Cluster",
    summary: "Demand for EV diagnostics and PLC technicians grew 38% YoY in Maharashtra, but ITI graduate capacity matches only 22% of regional employer hiring notices.",
    category: "Workforce Subsidy Policy",
    priority: "HIGH",
    confidenceScore: 0.94,
    estimatedImpact: "Fills 4,500 annual manufacturing skill vacancies and boosts employment placement by 24%.",
    evidenceTrace: {
      dataSources: ["Mahaswayam Rojgar Portal", "MSSDS Apprenticeship Records"],
      jobCountAnalyzed: 8450,
      wageSignal: "₹28,000/month average starting salary (+18% premium over non-certified operator roles)",
      gapSeverityIndex: 46.0,
      rationale: "Data demonstrates rapid hiring spike across 14 large OEM suppliers with verified persistent vacancy duration exceeding 45 days."
    },
    actionItems: [
      "Allocate ₹12 Cr state modernization grant for ITI lab upgrades in Pune and Nashik",
      "Launch co-certified apprenticeship model with industrial manufacturers",
      "Update NSQF Level 4 curriculum modules before Q3 2026"
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "reco-univ-202",
    targetRole: "UNIVERSITY",
    title: "Integrate Generative AI & Cloud-Native Security into B.Tech CSE Semester 6",
    summary: "Over 1,890 software job postings in Maharashtra require cloud security or AI integration skills, whereas university syllabi cover legacy monolithic concepts.",
    category: "Curriculum Modernization",
    priority: "CRITICAL",
    confidenceScore: 0.91,
    estimatedImpact: "Improves engineering graduate campus placement rate from 62% to 84% within 12 months.",
    evidenceTrace: {
      dataSources: ["NCS Portal", "Private Tech Job Scraping Ingestion Pipeline"],
      jobCountAnalyzed: 3420,
      wageSignal: "₹6.5 LPA baseline for graduates with verified hands-on Cloud Security projects",
      gapSeverityIndex: 31.5,
      rationale: "Automated curriculum audit identified zero credit-bearing modules for Containerization or Generative AI SDKs across 8 affiliated colleges."
    },
    actionItems: [
      "Replace 2 elective modules with Cloud Security Architecture & Container Orchestration",
      "Establish industry lab sponsorship with cloud platform partners",
      "Train 45 faculty members on hands-on MLOps deployment tools"
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "reco-std-303",
    targetRole: "STUDENT",
    title: "Enroll in SQL & Practical Business Intelligence Micro-Credential",
    summary: "Entry-level Data Entry & Accounts positions are transitioning to Data Analyst roles offering 40% higher compensation when candidates possess SQL verification.",
    category: "Upskilling Pathway",
    priority: "MEDIUM",
    confidenceScore: 0.89,
    estimatedImpact: "Increases interview callbacks by 3.2x for regional candidates in Chhatrapati Sambhajinagar and Thane.",
    evidenceTrace: {
      dataSources: ["State Employment Exchange Data", "Active SkillPulse Job Signals"],
      jobCountAnalyzed: 2980,
      wageSignal: "₹22,000/month vs ₹15,000/month for plain data entry roles",
      gapSeverityIndex: 18.0,
      rationale: "Employer job posting analysis reveals SQL as the single highest ROI skill keyword requested across SME service sectors."
    },
    actionItems: [
      "Complete 6-week state-certified online SQL & BI fundamentals course",
      "Add verified digital skill badge to Mahaswayam profile"
    ],
    createdAt: new Date().toISOString()
  }
];

export class RecommendationsService {
  static async listRecommendations(filter: RecommendationQueryFilter) {
    try {
      const prisma = getPrisma();
      const dbRecs = await prisma.recommendation.findMany();
      if (dbRecs.length > 0) {
        return { total: dbRecs.length, data: dbRecs };
      }
    } catch {
      // Fallback
    }

    let filtered = [...SAMPLE_RECOMMENDATIONS];
    if (filter.targetRole) {
      filtered = filtered.filter(r => r.targetRole.toUpperCase() === filter.targetRole!.toUpperCase());
    }
    if (filter.minConfidence) {
      filtered = filtered.filter(r => r.confidenceScore >= filter.minConfidence!);
    }

    return {
      total: filtered.length,
      data: filtered
    };
  }

  static async getRecommendationById(id: string) {
    try {
      const prisma = getPrisma();
      const dbRec = await prisma.recommendation.findUnique({ where: { id } });
      if (dbRec) return dbRec;
    } catch {
      // Fallback
    }

    const found = SAMPLE_RECOMMENDATIONS.find(r => r.id === id);
    if (!found) return SAMPLE_RECOMMENDATIONS[0];
    return found;
  }
}
