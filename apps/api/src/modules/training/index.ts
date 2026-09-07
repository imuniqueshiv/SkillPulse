export {
  TRAINING_METHODOLOGY_VERSION,
  TRAINING_NEED_LEVEL,
  TRAINING_CAPACITY_STATUS,
  CURRICULUM_COVERAGE_STATUS,
  PROGRAM_ALIGNMENT,
  TRAINING_INTERVENTION,
  TRAINING_CONFIDENCE,
  ALIGNMENT_THRESHOLD,
  TRAINING_NEED_PRIORITY_WEIGHT,
  CURRICULUM_GAP_PRIORITY_WEIGHT,
} from "./policy";

export type * from "./contract";
export type {
  TrainingNeedLevel,
  TrainingCapacityStatus,
  CurriculumCoverageStatus,
  ProgramAlignment,
  TrainingIntervention,
  TrainingConfidence,
} from "./policy";

export {
  loadTrainingPrograms,
  buildProgramView,
  dedupeProgramSkills,
  programsCoveringSkill,
} from "./programs";
export {
  classifyTrainingCapacity,
  classifyTrainingNeed,
  classifyTrainingConfidence,
  computeTrainingNeedPriority,
  buildTrainingNeeds,
} from "./need";
export {
  buildMarketSignals,
  computeDemandWeightedCoverage,
  classifyAlignment,
  computeCurriculumGapPriority,
  analyzeProgramAlignment,
} from "./coverage";
export {
  extractTrainingCapacity,
  summarizeTrainingIntelligence,
  summarizeTrainingIntelligenceFromDb,
} from "./summary";
