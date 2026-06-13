-- Task 7: Enhanced debate configuration & AI scoring
-- Adds infoForUsers and aiInstructions to challenges table
-- Adds customOutcome and outcomeScore to challenge_attempts table

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS info_for_users text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS ai_instructions text;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS custom_outcome text;
ALTER TABLE challenge_attempts ADD COLUMN IF NOT EXISTS outcome_score integer;
