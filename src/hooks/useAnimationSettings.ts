"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AnimationSettings {
  // Idle animation
  idle_rotate_min: number;
  idle_rotate_max: number;
  idle_y_min: number;
  idle_y_max: number;
  idle_duration: number;
  
  // Blink animation
  blink_base_min: number;
  blink_base_max: number;
  blink_duration: number;
  blink_speed_multiplier: number;
  
  // Answering animation
  answering_y_base: number;
  answering_y_amp_multiplier: number;
  answering_rotate_base: number;
  answering_rotate_amp_multiplier: number;
  answering_duration_base: number;
  answering_duration_amp_factor: number;
  
  // Emphasis animation
  emphasis_rotate_keyframes: number[];
  emphasis_y_keyframes: number[];
  emphasis_duration: number;
  
  // Audio reactive
  audio_sensitivity: number;
  audio_clamp_min: number;
  audio_clamp_max: number;
}

const defaultSettings: AnimationSettings = {
  // Idle animation
  idle_rotate_min: -1.2,
  idle_rotate_max: 1.2,
  idle_y_min: 0,
  idle_y_max: 3,
  idle_duration: 4000,
  
  // Blink animation
  blink_base_min: 2200,
  blink_base_max: 5200,
  blink_duration: 140,
  blink_speed_multiplier: 1.35,
  
  // Answering animation
  answering_y_base: 2,
  answering_y_amp_multiplier: 6,
  answering_rotate_base: 0.8,
  answering_rotate_amp_multiplier: 2,
  answering_duration_base: 0.38,
  answering_duration_amp_factor: 0.22,
  
  // Emphasis animation
  emphasis_rotate_keyframes: [0, -2.5, 1.5, 0],
  emphasis_y_keyframes: [0, -2, 0],
  emphasis_duration: 420,
  
  // Audio reactive
  audio_sensitivity: 8,
  audio_clamp_min: 0,
  audio_clamp_max: 1,
};

export function useAnimationSettings() {
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'animation_settings')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading animation settings:', error);
        return;
      }

      if (data?.value) {
        setSettings({ ...defaultSettings, ...data.value });
      }
    } catch (error) {
      console.error('Error loading animation settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
}
