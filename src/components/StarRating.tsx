import React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  userRating?: number;
  onRate?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  userRating = 0,
  onRate,
  showCount = false,
  count = 0,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0);

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const sizeClass = sizeClasses[size];

  const handleClick = (value: number) => {
    if (interactive && onRate) {
      onRate(value);
    }
  };

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(displayRating);
          const isUserRated = interactive && userRating > 0 && starValue <= userRating;

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              className={`transition-all ${
                interactive
                  ? "cursor-pointer hover:scale-110 active:scale-95"
                  : "cursor-default"
              }`}
            >
              <Star
                className={`${sizeClass} transition-colors ${
                  isFilled
                    ? isUserRated
                      ? "fill-blue-500 text-blue-500"
                      : "fill-yellow-500 text-yellow-500"
                    : "fill-none text-muted-foreground"
                }`}
              />
            </button>
          );
        })}
      </div>
      {showCount && count > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          ({count})
        </span>
      )}
      {rating > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
