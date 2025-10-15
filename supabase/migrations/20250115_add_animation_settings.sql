-- Add animation_settings column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS animation_settings JSONB DEFAULT '{
  "idle_rotate_min": -1.2,
  "idle_rotate_max": 1.2,
  "idle_y_min": 0,
  "idle_y_max": 3,
  "idle_duration": 4000,
  "blink_base_min": 2200,
  "blink_base_max": 5200,
  "blink_duration": 140,
  "blink_speed_multiplier": 1.35,
  "answering_y_base": 2,
  "answering_y_amp_multiplier": 6,
  "answering_rotate_base": 0.8,
  "answering_rotate_amp_multiplier": 2,
  "answering_duration_base": 0.38,
  "answering_duration_amp_factor": 0.22,
  "emphasis_rotate_keyframes": [0, -2.5, 1.5, 0],
  "emphasis_y_keyframes": [0, -2, 0],
  "emphasis_duration": 420,
  "audio_sensitivity": 8,
  "audio_clamp_min": 0,
  "audio_clamp_max": 1
}'::jsonb;
