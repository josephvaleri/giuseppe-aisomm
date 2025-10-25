"use client";

import { WineGlassRating } from "@/components/ui/wine-glass-rating";

interface RatingDisplayProps {
  rating: number;
}

export function RatingDisplay({ rating }: RatingDisplayProps) {
  return (
    <WineGlassRating 
      rating={rating}
      onRatingChange={() => {}}
      maxRating={5}
      size="sm"
      interactive={false}
    />
  );
}

