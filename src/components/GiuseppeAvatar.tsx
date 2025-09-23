"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GiuseppeAvatarProps {
  className?: string;
  src?: string;
  alt?: string;
  isThinking?: boolean;
}

interface ThinkingImage {
  stage_order: number;
  image_url: string;
}

export default function GiuseppeAvatar({ 
  className = "w-64 h-auto", 
  src = "/Giuseppe_001.png",
  alt = "Giuseppe Avatar",
  isThinking = false
}: GiuseppeAvatarProps) {
  const [blink, setBlink] = useState(false);
  const [thinkingImages, setThinkingImages] = useState<ThinkingImage[]>([]);
  const [thinkingInterval, setThinkingInterval] = useState(2000);
  const [currentThinkingStage, setCurrentThinkingStage] = useState(0);
  const supabase = createClient();

  // Load thinking images and settings
  useEffect(() => {
    const loadThinkingData = async () => {
      try {
        // Load thinking images
        const { data: images } = await supabase
          .from('thinking_images')
          .select('stage_order, image_url')
          .order('stage_order');

        if (images && images.length > 0) {
          setThinkingImages(images);
        }

        // Load thinking interval
        const { data: settings } = await supabase
          .from('settings')
          .select('thinking_interval_ms')
          .single();

        if (settings?.thinking_interval_ms) {
          setThinkingInterval(settings.thinking_interval_ms);
        }
      } catch (error) {
        console.error('Error loading thinking data:', error);
      }
    };

    loadThinkingData();
  }, [supabase]);

  // Blinking animation
  useEffect(() => {
    if (!isThinking) {
      const blinkInterval = () => {
        const timeout = Math.floor(Math.random() * 3000) + 7000; // 7–10s
        setTimeout(() => {
          if (!isThinking) { // Double-check we're still not thinking
            setBlink(true);
            setTimeout(() => setBlink(false), 200); // blink lasts ~200ms
            blinkInterval();
          }
        }, timeout);
      };
      blinkInterval();
    } else {
      // Clear any pending blinks when thinking starts
      setBlink(false);
    }
  }, [isThinking]);

  // Thinking animation
  useEffect(() => {
    if (isThinking && thinkingImages.length > 0) {
      const thinkingTimer = setInterval(() => {
        setCurrentThinkingStage((prev) => (prev + 1) % thinkingImages.length);
      }, thinkingInterval);

      return () => clearInterval(thinkingTimer);
    }
  }, [isThinking, thinkingImages.length, thinkingInterval]);

  // Determine which image to show
  const getImageSrc = () => {
    if (isThinking && thinkingImages.length > 0) {
      return thinkingImages[currentThinkingStage]?.image_url || src;
    }
    
    if (blink) {
      return "/Giuseppe_001_closed.png";
    }
    
    return src;
  };

  return (
    <div className="relative">
      {/* Main Giuseppe Image with Breathing Animation */}
      <motion.img
        src={getImageSrc()}
        alt={alt}
        className={className}
        animate={{ y: [0, -2, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}