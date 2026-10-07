"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  TourMode,
  TourStep,
  TourSection,
  ONBOARDING_STEPS,
  PRESENTATION_SECTIONS,
} from "./tourConfig";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { TourSpotlightOverlay } from "./TourSpotlightOverlay";
import { TourIntroModal } from "./TourIntroModal";
import { TourSectionIntroModal } from "./TourSectionIntroModal";
import { TourConclusionModal } from "./TourConclusionModal";
import { TourSectionMenuModal } from "./TourSectionMenuModal";
import { TourSelectModal } from "./TourSelectModal";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { useAuth } from "@/components/providers/AuthProvider";

interface TourContextValue {
  mode: TourMode;
  activeSectionIndex: number;
  activeStepIndex: number;
  isPaused: boolean;
  startOnboarding: () => void;
  startPresentation: (initialSectionId?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipSection: () => void;
  jumpToSection: (sectionId: string) => void;
  togglePause: () => void;
  exitTour: () => void;
  restartTour: () => void;
  openSectionMenu: () => void;
  closeSectionMenu: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  openTourSelectModal: () => void;
  closeTourSelectModal: () => void;
}

const TourContext = React.createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = React.useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authUser, user, can } = useAuth();

  const [mode, setMode] = React.useState<TourMode>("idle");
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  // Modals state
  const [isPresentationIntro, setIsPresentationIntro] = React.useState(false);
  const [isSectionIntro, setIsSectionIntro] = React.useState(false);
  const [isPresentationSummary, setIsPresentationSummary] = React.useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = React.useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = React.useState(false);
  const [isTourSelectModalOpen, setIsTourSelectModalOpen] = React.useState(false);

  // Track visited sections for checkmarks in table of contents
  const [visitedSections, setVisitedSections] = React.useState<Set<string>>(new Set());

  // Filter presentation sections by current user permissions if restricted
  const allowedSections = React.useMemo(() => {
    return PRESENTATION_SECTIONS.filter((sec) => {
      if (!sec.requiredRole) return true;
      return can(sec.requiredRole);
    });
  }, [can]);

  const currentSection = allowedSections[activeSectionIndex] || allowedSections[0];

  const currentStep = React.useMemo<TourStep | null>(() => {
    if (mode === "onboarding") {
      return ONBOARDING_STEPS[activeStepIndex] || null;
    }
    if (mode === "presentation") {
      if (!currentSection) return null;
      return currentSection.steps[activeStepIndex] || null;
    }
    return null;
  }, [mode, activeStepIndex, currentSection]);

  // Navigate to step's route if different from current route
  const navigateToStepRoute = React.useCallback(
    (targetRoute?: string) => {
      if (!targetRoute) return;
      // Strip query params to compare base path
      const currentFull = typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname;
      if (currentFull !== targetRoute) {
        router.push(targetRoute);
      }
    },
    [pathname, router]
  );

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const startOnboarding = React.useCallback(() => {
    setMode("onboarding");
    setActiveStepIndex(0);
    setIsPaused(false);
    setIsPresentationIntro(false);
    setIsSectionIntro(false);
    setIsPresentationSummary(false);
    setIsSectionMenuOpen(false);

    const firstStep = ONBOARDING_STEPS[0];
    if (firstStep) navigateToStepRoute(firstStep.route);
  }, [navigateToStepRoute]);

  const startPresentation = React.useCallback(
    (initialSectionId?: string) => {
      setMode("presentation");
      setIsPaused(false);
      setIsPresentationSummary(false);
      setIsSectionMenuOpen(false);

      if (initialSectionId) {
        const foundIdx = allowedSections.findIndex((s) => s.id === initialSectionId);
        const idx = foundIdx !== -1 ? foundIdx : 0;
        setActiveSectionIndex(idx);
        setActiveStepIndex(0);
        setIsPresentationIntro(false);
        setIsSectionIntro(true);
      } else {
        setActiveSectionIndex(0);
        setActiveStepIndex(0);
        setIsPresentationIntro(true);
        setIsSectionIntro(false);
      }
    },
    [allowedSections]
  );

  const exitTour = React.useCallback(() => {
    setMode("idle");
    setIsPaused(false);
    setIsPresentationIntro(false);
    setIsSectionIntro(false);
    setIsPresentationSummary(false);
    setIsSectionMenuOpen(false);
    setIsTourSelectModalOpen(false);
    setIsShortcutsModalOpen(false);
  }, []);

  const nextStep = React.useCallback(() => {
    if (mode === "onboarding") {
      if (activeStepIndex < ONBOARDING_STEPS.length - 1) {
        const nextIdx = activeStepIndex + 1;
        setActiveStepIndex(nextIdx);
        const step = ONBOARDING_STEPS[nextIdx];
        if (step) navigateToStepRoute(step.route);
      } else {
        // Finished onboarding
        try {
          localStorage.setItem("travel_agency_onboarding_completed", "true");
        } catch {}
        exitTour();
      }
      return;
    }

    if (mode === "presentation") {
      // 1. If currently on presentation welcome intro
      if (isPresentationIntro) {
        setIsPresentationIntro(false);
        setIsSectionIntro(true);
        return;
      }

      // 2. If currently on section intro
      if (isSectionIntro) {
        setIsSectionIntro(false);
        setActiveStepIndex(0);
        const step = currentSection?.steps[0];
        if (step) navigateToStepRoute(step.route);
        return;
      }

      // 3. Advancing inside current section
      if (currentSection && activeStepIndex < currentSection.steps.length - 1) {
        const nextIdx = activeStepIndex + 1;
        setActiveStepIndex(nextIdx);
        const step = currentSection.steps[nextIdx];
        if (step) navigateToStepRoute(step.route);
        return;
      }

      // 4. Finished last step of current section
      if (currentSection) {
        setVisitedSections((prev) => new Set(prev).add(currentSection.id));
      }

      // Check if more sections exist
      if (activeSectionIndex < allowedSections.length - 1) {
        const nextSecIdx = activeSectionIndex + 1;
        setActiveSectionIndex(nextSecIdx);
        setActiveStepIndex(0);
        setIsSectionIntro(true);
      } else {
        // Reached end of presentation! Show conclusion summary
        setIsPresentationSummary(true);
      }
    }
  }, [
    mode,
    activeStepIndex,
    activeSectionIndex,
    isPresentationIntro,
    isSectionIntro,
    currentSection,
    allowedSections,
    navigateToStepRoute,
    exitTour,
  ]);

  const prevStep = React.useCallback(() => {
    if (mode === "onboarding") {
      if (activeStepIndex > 0) {
        const prevIdx = activeStepIndex - 1;
        setActiveStepIndex(prevIdx);
        const step = ONBOARDING_STEPS[prevIdx];
        if (step) navigateToStepRoute(step.route);
      }
      return;
    }

    if (mode === "presentation") {
      if (isPresentationSummary) {
        setIsPresentationSummary(false);
        if (currentSection) {
          setActiveStepIndex(currentSection.steps.length - 1);
          const step = currentSection.steps[currentSection.steps.length - 1];
          if (step) navigateToStepRoute(step.route);
        }
        return;
      }

      if (isSectionIntro) {
        if (activeSectionIndex > 0) {
          const prevSecIdx = activeSectionIndex - 1;
          const prevSec = allowedSections[prevSecIdx];
          setActiveSectionIndex(prevSecIdx);
          if (prevSec && prevSec.steps.length > 0) {
            setIsSectionIntro(false);
            const lastStepIdx = prevSec.steps.length - 1;
            setActiveStepIndex(lastStepIdx);
            navigateToStepRoute(prevSec.steps[lastStepIdx].route);
          }
        } else {
          setIsSectionIntro(false);
          setIsPresentationIntro(true);
        }
        return;
      }

      if (activeStepIndex > 0) {
        const prevIdx = activeStepIndex - 1;
        setActiveStepIndex(prevIdx);
        const step = currentSection?.steps[prevIdx];
        if (step) navigateToStepRoute(step.route);
      } else {
        // Return to section intro
        setIsSectionIntro(true);
      }
    }
  }, [
    mode,
    activeStepIndex,
    activeSectionIndex,
    isPresentationSummary,
    isSectionIntro,
    currentSection,
    allowedSections,
    navigateToStepRoute,
  ]);

  const skipSection = React.useCallback(() => {
    if (mode !== "presentation") return;
    if (currentSection) {
      setVisitedSections((prev) => new Set(prev).add(currentSection.id));
    }

    if (activeSectionIndex < allowedSections.length - 1) {
      const nextSecIdx = activeSectionIndex + 1;
      setActiveSectionIndex(nextSecIdx);
      setActiveStepIndex(0);
      setIsSectionIntro(true);
    } else {
      setIsPresentationSummary(true);
    }
  }, [mode, currentSection, activeSectionIndex, allowedSections]);

  const jumpToSection = React.useCallback(
    (sectionId: string) => {
      const idx = allowedSections.findIndex((s) => s.id === sectionId);
      if (idx !== -1) {
        setMode("presentation");
        setActiveSectionIndex(idx);
        setActiveStepIndex(0);
        setIsPresentationIntro(false);
        setIsSectionIntro(true);
        setIsPresentationSummary(false);
        setIsSectionMenuOpen(false);
        setIsPaused(false);
      }
    },
    [allowedSections]
  );

  const togglePause = React.useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const restartTour = React.useCallback(() => {
    if (mode === "onboarding") {
      startOnboarding();
    } else {
      setVisitedSections(new Set());
      startPresentation();
    }
  }, [mode, startOnboarding, startPresentation]);

  const openSectionMenu = React.useCallback(() => {
    setIsSectionMenuOpen(true);
  }, []);

  const closeSectionMenu = React.useCallback(() => {
    setIsSectionMenuOpen(false);
  }, []);

  const openShortcutsModal = React.useCallback(() => {
    setIsShortcutsModalOpen(true);
  }, []);

  const closeShortcutsModal = React.useCallback(() => {
    setIsShortcutsModalOpen(false);
  }, []);

  const openTourSelectModal = React.useCallback(() => {
    setIsTourSelectModalOpen(true);
  }, []);

  const closeTourSelectModal = React.useCallback(() => {
    setIsTourSelectModalOpen(false);
  }, []);

  // Hook up keyboard shortcuts
  useKeyboardShortcuts({
    tourMode: mode,
    isPaused,
    isSectionMenuOpen,
    isShortcutsModalOpen,
    isTourSelectModalOpen,
    isSectionIntro,
    isPresentationIntro,
    isPresentationSummary,
    nextStep,
    prevStep,
    togglePause,
    exitTour,
    openSectionMenu,
    closeSectionMenu,
    openShortcutsModal,
    closeShortcutsModal,
    openTourSelectModal,
    closeTourSelectModal,
    startPresentation: () => startPresentation(),
    startOnboarding,
  });

  const contextValue = React.useMemo<TourContextValue>(
    () => ({
      mode,
      activeSectionIndex,
      activeStepIndex,
      isPaused,
      startOnboarding,
      startPresentation,
      nextStep,
      prevStep,
      skipSection,
      jumpToSection,
      togglePause,
      exitTour,
      restartTour,
      openSectionMenu,
      closeSectionMenu,
      openShortcutsModal,
      closeShortcutsModal,
      openTourSelectModal,
      closeTourSelectModal,
    }),
    [
      mode,
      activeSectionIndex,
      activeStepIndex,
      isPaused,
      startOnboarding,
      startPresentation,
      nextStep,
      prevStep,
      skipSection,
      jumpToSection,
      togglePause,
      exitTour,
      restartTour,
      openSectionMenu,
      closeSectionMenu,
      openShortcutsModal,
      closeShortcutsModal,
      openTourSelectModal,
      closeTourSelectModal,
    ]
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {/* 1. Presentation Welcome Intro Modal */}
      {mode === "presentation" && isPresentationIntro && (
        <TourIntroModal
          isOpen={true}
          sections={allowedSections}
          onStart={() => {
            setIsPresentationIntro(false);
            setIsSectionIntro(true);
          }}
          onExit={exitTour}
          onSelectSection={(secId) => jumpToSection(secId)}
        />
      )}

      {/* 2. Presentation Section Intro Modal */}
      {mode === "presentation" && isSectionIntro && currentSection && (
        <TourSectionIntroModal
          isOpen={true}
          section={currentSection}
          sectionIndex={activeSectionIndex}
          totalSections={allowedSections.length}
          onStartSection={() => {
            setIsSectionIntro(false);
            setActiveStepIndex(0);
            const step = currentSection.steps[0];
            if (step) navigateToStepRoute(step.route);
          }}
          onSkipSection={skipSection}
          onPrevSection={
            activeSectionIndex > 0
              ? () => {
                  const prevIdx = activeSectionIndex - 1;
                  setActiveSectionIndex(prevIdx);
                  setActiveStepIndex(0);
                }
              : undefined
          }
          onOpenSectionMenu={openSectionMenu}
          onExit={exitTour}
        />
      )}

      {/* 3. Presentation Conclusion Modal */}
      {mode === "presentation" && isPresentationSummary && (
        <TourConclusionModal
          isOpen={true}
          sections={allowedSections}
          onRestart={restartTour}
          onOpenSectionMenu={openSectionMenu}
          onExit={exitTour}
        />
      )}

      {/* 4. Active Tour Spotlight & Popover (when on a real step) */}
      {mode !== "idle" &&
        !isPresentationIntro &&
        !isSectionIntro &&
        !isPresentationSummary &&
        currentStep && (
          <TourSpotlightOverlay
            mode={mode}
            step={currentStep}
            section={mode === "presentation" ? currentSection : undefined}
            stepIndex={activeStepIndex}
            totalStepsInSection={
              mode === "onboarding"
                ? ONBOARDING_STEPS.length
                : currentSection?.steps.length || 1
            }
            sectionIndex={activeSectionIndex}
            totalSections={allowedSections.length}
            isPaused={isPaused}
            onNext={nextStep}
            onPrev={prevStep}
            onSkipSection={mode === "presentation" ? skipSection : undefined}
            onTogglePause={togglePause}
            onOpenSectionMenu={openSectionMenu}
            onExit={exitTour}
          />
        )}

      {/* 5. Section Menu / Table of Contents Modal */}
      <TourSectionMenuModal
        isOpen={isSectionMenuOpen}
        sections={allowedSections}
        activeSectionIndex={activeSectionIndex}
        visitedSections={visitedSections}
        onSelectSection={(secId) => jumpToSection(secId)}
        onClose={closeSectionMenu}
        onRestart={restartTour}
      />

      {/* 6. Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={closeShortcutsModal}
        onStartOnboarding={startOnboarding}
        onStartPresentation={() => startPresentation()}
      />

      {/* 7. Tour Selector Modal (Onboarding vs Presentation) */}
      <TourSelectModal
        isOpen={isTourSelectModalOpen}
        onClose={closeTourSelectModal}
        onSelectOnboarding={startOnboarding}
        onSelectPresentation={() => startPresentation()}
        onOpenShortcuts={openShortcutsModal}
      />
    </TourContext.Provider>
  );
}
