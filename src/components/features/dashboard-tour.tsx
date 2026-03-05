"use client";

import { useCallback } from "react";
import { TourModal } from "@/components/features/tour-modal";
import { useGuidedTour } from "@/hooks/use-guided-tour";
import { useCelebration } from "@/hooks/use-celebration";

interface DashboardTourProps {
  isSharedHousehold: boolean;
}

export function DashboardTour({ isSharedHousehold }: DashboardTourProps) {
  const tour = useGuidedTour(isSharedHousehold);
  const { celebrate } = useCelebration();

  const handleNavigate = useCallback(() => {
    if (tour.activeTourSection) {
      tour.markSectionToured(tour.activeTourSection);
    }
  }, [tour]);

  const handleDismiss = useCallback(() => {
    tour.advanceToNext();
  }, [tour]);

  const handleSkipTour = useCallback(() => {
    tour.skipTour();
    celebrate("tour-complete");
  }, [tour, celebrate]);

  if (!tour.shouldShowTour || !tour.activeTourSection) return null;

  return (
    <TourModal
      section={tour.activeTourSection}
      stepNumber={tour.getTourStepNumber(tour.activeTourSection)}
      totalSteps={tour.totalSteps}
      open={tour.shouldShowTour}
      onDismiss={handleDismiss}
      onSkipTour={handleSkipTour}
      onNavigate={handleNavigate}
    />
  );
}
