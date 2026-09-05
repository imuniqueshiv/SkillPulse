import { getPrisma } from "../../config/database";

export interface GapQueryFilter {
  sector?: string;
  minSeverity?: number;
  level?: string;
}

const SAMPLE_CURRICULA = [
  {
    id: "curr-btech-cse-2024",
    title: "B.Tech Computer Science & Engineering",
    institutionType: "University",
    state: "Maharashtra",
    nsqfLevel: 7,
    lastUpdated: "2023-06-15",
    totalModules: 32,
    skillCoverageScore: 68.5,
    gapSeverityScore: 31.5,
    missingSkills: ["Cloud-Native Security", "Generative AI API Integration", "MLOps & Pipeline CI/CD"],
    outdatedTopics: ["Legacy Monolithic Servlet Architecture", "SOAP Web Services"],
    rootCauseDiagnosis: "Curriculum last revised 18 months ago; rapid industry shift towards AI/ML infrastructure outpaced annual academic revision cycle."
  },
  {
    id: "curr-iti-electrician-v2",
    title: "ITI Electrician Vocational Certification",
    institutionType: "Vocational Institute (ITI)",
    state: "Maharashtra",
    nsqfLevel: 4,
    lastUpdated: "2022-04-10",
    totalModules: 18,
    skillCoverageScore: 54.0,
    gapSeverityScore: 46.0,
    missingSkills: ["EV Charging Station Diagnostics", "Solar Inverter Maintenance", "PLC Automation Basics"],
    outdatedTopics: ["Analog Meter Calibration (Discontinued standard)"],
    rootCauseDiagnosis: "Industrial electrification standards updated nationally in 2025; state ITI practical lab equipment pending modernization funding."
  },
  {
    id: "curr-diploma-data-analytics",
    title: "Diploma in Data Analytics & Business Intelligence",
    institutionType: "Polytechnic Institute",
    state: "Maharashtra",
    nsqfLevel: 5,
    lastUpdated: "2024-01-20",
    totalModules: 22,
    skillCoverageScore: 82.0,
    gapSeverityScore: 18.0,
    missingSkills: ["Real-time Stream Processing (Apache Kafka)", "Vector Databases"],
    outdatedTopics: [],
    rootCauseDiagnosis: "Strong baseline data fundamentals; minor gap in specialized modern real-time streaming tools."
  }
];

export class CurriculaService {
  static async listCurricula() {
    try {
      const prisma = getPrisma();
      const dbCurricula = await prisma.curriculum.findMany();
      if (dbCurricula.length > 0) {
        return { total: dbCurricula.length, data: dbCurricula };
      }
    } catch {
      // Fallback
    }
    return { total: SAMPLE_CURRICULA.length, data: SAMPLE_CURRICULA };
  }

  static async getGapAnalysis(filter: GapQueryFilter) {
    let gaps = SAMPLE_CURRICULA.map(c => ({
      curriculumId: c.id,
      curriculumTitle: c.title,
      institutionType: c.institutionType,
      gapSeverityScore: c.gapSeverityScore,
      skillCoverageScore: c.skillCoverageScore,
      missingSkillsCount: c.missingSkills.length,
      missingSkills: c.missingSkills,
      outdatedTopics: c.outdatedTopics,
      rootCauseDiagnosis: c.rootCauseDiagnosis,
      evaluatedAt: new Date().toISOString()
    }));

    if (filter.minSeverity) {
      gaps = gaps.filter(g => g.gapSeverityScore >= filter.minSeverity!);
    }

    return {
      averageGapSeverity: 31.83,
      criticalGapsCount: gaps.filter(g => g.gapSeverityScore > 30).length,
      data: gaps
    };
  }

  static async getCurriculumGapById(id: string) {
    const found = SAMPLE_CURRICULA.find(c => c.id === id) || SAMPLE_CURRICULA[0];
    return {
      ...found,
      detailedBreakdown: [
        { module: "Module 4: Advanced Software Architecture", gapScore: 42, missingSkill: "Cloud-Native Infrastructure" },
        { module: "Module 7: Applied Intelligence", gapScore: 38, missingSkill: "Generative AI Integration" }
      ],
      industryDemandSignals: [
        { skill: "Cloud Security", demandGrowth: "+28%", totalJobPostings: 1420 },
        { skill: "MLOps", demandGrowth: "+35%", totalJobPostings: 980 }
      ]
    };
  }
}
