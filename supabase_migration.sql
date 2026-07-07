-- Run this in Supabase SQL Editor to add the new columns for Agent Builder features
-- Safe to run multiple times (uses IF NOT EXISTS pattern via DO blocks)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agent_profiles' AND column_name='welcome_message') THEN
    ALTER TABLE agent_profiles ADD COLUMN welcome_message TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agent_profiles' AND column_name='speech_settings') THEN
    ALTER TABLE agent_profiles ADD COLUMN speech_settings TEXT DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agent_profiles' AND column_name='call_settings') THEN
    ALTER TABLE agent_profiles ADD COLUMN call_settings TEXT DEFAULT '{}';
  END IF;

  -- Add knowledge_base if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agent_profiles' AND column_name='knowledge_base') THEN
    ALTER TABLE agent_profiles ADD COLUMN knowledge_base TEXT DEFAULT '';
  END IF;
END $$;

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'agent_profiles'
ORDER BY ordinal_position;
