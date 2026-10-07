"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TourMode } from "./tourConfig";

interface UseKeyboardShortcutsProps {
  tourMode: TourMode;
  isPaused: boolean;
  isSectionMenuOpen: boolean;
  isShortcutsModalOpen: boolean;
  isTourSelectModalOpen: boolean;
  isSectionIntro: boolean;
  isPresentationIntro: boolean;
  isPresentationSummary: boolean;
  nextStep: () => void;
  prevStep: () => void;
  togglePause: () => void;
  exitTour: () => void;
  openSectionMenu: () => void;
  closeSectionMenu: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  openTourSelectModal: () => void;
  closeTourSelectModal: () => void;
  startPresentation: () => void;
  startOnboarding: () => void;
}

export function useKeyboardShortcuts({
  tourMode,
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
  startPresentation,
  startOnboarding,
}: UseKeyboardShortcutsProps) {
  const router = useRouter();
  const pendingChordRef = React.useRef<string | null>(null);
  const chordTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Detect if the user is currently typing in an input element
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        target?.getAttribute("role") === "textbox";

      // 2. Escape key handling: always allow Escape to close open modals or exit tour
      if (e.key === "Escape") {
        if (isShortcutsModalOpen) {
          e.preventDefault();
          closeShortcutsModal();
          return;
        }
        if (isTourSelectModalOpen) {
          e.preventDefault();
          closeTourSelectModal();
          return;
        }
        if (isSectionMenuOpen) {
          e.preventDefault();
          closeSectionMenu();
          return;
        }
        if (tourMode !== "idle") {
          e.preventDefault();
          exitTour();
          return;
        }
        return;
      }

      // If user is currently typing in an input field, do not hijack normal typing!
      if (isInput) {
        return;
      }

      // 3. Tour active keyboard navigation
      const isTourActive = tourMode !== "idle";
      const isModalOverlayOpen =
        isShortcutsModalOpen || isTourSelectModalOpen || isSectionMenuOpen;

      if (isTourActive && !isModalOverlayOpen) {
        // Space toggles pause in presentation mode (only when not on intro/conclusion modals)
        if (
          e.code === "Space" &&
          tourMode === "presentation" &&
          !isSectionIntro &&
          !isPresentationIntro &&
          !isPresentationSummary
        ) {
          e.preventDefault();
          togglePause();
          return;
        }

        // Right arrow or Enter advances step
        if (e.key === "ArrowRight" || (e.key === "Enter" && !e.ctrlKey && !e.metaKey)) {
          e.preventDefault();
          nextStep();
          return;
        }

        // Left arrow goes to previous step
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prevStep();
          return;
        }

        // 'm' or 't' toggles section table of contents in presentation mode
        if (
          (e.key.toLowerCase() === "m" || e.key.toLowerCase() === "t") &&
          tourMode === "presentation"
        ) {
          e.preventDefault();
          openSectionMenu();
          return;
        }
      }

      // 4. Global Modifiers & Triggers
      // Alt + T: Open tour selection dialog
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        openTourSelectModal();
        return;
      }

      // Alt + P: Launch presentation mode
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        startPresentation();
        return;
      }

      // Alt + O: Launch onboarding mode
      if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        startOnboarding();
        return;
      }

      // '?' or 'Shift + /' or 'Ctrl + /': Open Keyboard Shortcuts Help
      if (
        (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        (e.key === "/" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        openShortcutsModal();
        return;
      }

      // 5. Sequential Navigation Chords (e.g. 'g' then 'd')
      const key = e.key.toLowerCase();

      // If already in a chord sequence
      if (pendingChordRef.current === "g") {
        e.preventDefault();
        pendingChordRef.current = null;
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);

        switch (key) {
          case "d":
            router.push("/dashboard");
            break;
          case "a":
            router.push("/applicants");
            break;
          case "c":
            router.push("/chat");
            break;
          case "e":
            router.push("/employees");
            break;
          case "p":
            router.push("/contractors");
            break;
          case "m":
            router.push("/commission");
            break;
          case "f":
            router.push("/expenses-income");
            break;
          case "r":
            router.push("/reports");
            break;
        }
        return;
      }

      // 'n' or 'c' followed by 'a' -> Add applicant
      if (pendingChordRef.current === "n" || pendingChordRef.current === "c") {
        e.preventDefault();
        pendingChordRef.current = null;
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);

        if (key === "a") {
          router.push("/applicants/new");
        }
        return;
      }

      // Check if user initiated a leading chord key ('g', 'n', 'c')
      if (
        (key === "g" || key === "n" || key === "c") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        pendingChordRef.current = key;
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
        chordTimeoutRef.current = setTimeout(() => {
          pendingChordRef.current = null;
        }, 900);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
    };
  }, [
    tourMode,
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
    startPresentation,
    startOnboarding,
    router,
  ]);
}
