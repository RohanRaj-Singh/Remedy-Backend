// src/types/scoring.ts

/** Defines the structure for question metadata (weights and inversion logic) */
export interface QuestionMetadata {
    weight: number; // The diagnostic weight (%) for WRS calculation
    is_inverted: boolean; // True if 1=High Risk, 4=Low Risk (e.g., Q2, Q20)
}

/** Defines the structure for dashboard domain metadata */
export interface DomainConfig {
    name: string;
    total_weight: number; // Sum of weights in the domain
    max_possible_score: number; // total_weight * 4
    questions: string[]; // List of Q# that contribute to this domain
}