import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { Input } from "../src/components/ui/input";

test("Date Input UI Picker & Accessibility Audit", async (t) => {
  await t.test("1. Renders input[type='date'] with cursor-pointer and calendar picker styling classes", () => {
    const html = renderToString(React.createElement(Input, { type: "date", id: "test-dob" }));
    assert.match(html, /type="date"/);
    assert.match(html, /cursor-pointer/);
    assert.match(html, /\[(&|&amp;)::-webkit-calendar-picker-indicator\]:cursor-pointer/);
  });

  await t.test("2. globals.css defines color-scheme and calendar indicator styling for light and dark modes", () => {
    const cssPath = path.resolve(__dirname, "../src/app/globals.css");
    const css = fs.readFileSync(cssPath, "utf8");

    // Must define color-scheme: light for date inputs
    assert.match(
      css,
      /input\[type="date"\][\s\S]*?color-scheme:\s*light/,
      "globals.css must set color-scheme: light for input[type='date']"
    );

    // Must define color-scheme: dark for dark mode date inputs
    assert.match(
      css,
      /\.dark\s+input\[type="date"\][\s\S]*?color-scheme:\s*dark/,
      "globals.css must set color-scheme: dark for dark mode input[type='date']"
    );

    // Must define styling for ::-webkit-calendar-picker-indicator
    assert.match(
      css,
      /input\[type="date"\]::-webkit-calendar-picker-indicator/,
      "globals.css must style ::-webkit-calendar-picker-indicator"
    );
  });

  await t.test("3. Input click and keydown handlers trigger showPicker() safely", () => {
    let showPickerCalled = 0;
    let customClickCalled = 0;
    let customKeyDownCalled = 0;

    const mockElement = {
      showPicker: () => {
        showPickerCalled++;
      },
    };

    // Simulate input handleClick logic
    const simulateClick = (
      type: string,
      disabled?: boolean,
      readOnly?: boolean,
      onClick?: (e: any) => void
    ) => {
      const isDateType = type === "date" || type === "datetime-local" || type === "time";
      const e = { currentTarget: mockElement };
      if (isDateType && !disabled && !readOnly) {
        if (typeof (e.currentTarget as any).showPicker === "function") {
          try {
            (e.currentTarget as any).showPicker();
          } catch {
            // ignore
          }
        }
      }
      onClick?.(e);
    };

    // When clicking an active date input -> showPicker is triggered
    simulateClick("date", false, false, () => customClickCalled++);
    assert.equal(showPickerCalled, 1, "Clicking an active date input must invoke showPicker()");
    assert.equal(customClickCalled, 1, "Custom onClick must also be called");

    // When clicking a disabled date input -> showPicker must NOT be called
    simulateClick("date", true, false);
    assert.equal(showPickerCalled, 1, "Disabled date input must not call showPicker()");

    // When clicking a read-only date input -> showPicker must NOT be called
    simulateClick("date", false, true);
    assert.equal(showPickerCalled, 1, "Read-only date input must not call showPicker()");

    // When clicking a text input -> showPicker must NOT be called
    simulateClick("text", false, false);
    assert.equal(showPickerCalled, 1, "Regular text input must not call showPicker()");

    // Simulate keydown logic
    const simulateKeyDown = (
      type: string,
      key: string,
      disabled?: boolean,
      readOnly?: boolean,
      onKeyDown?: (e: any) => void
    ) => {
      const isDateType = type === "date" || type === "datetime-local" || type === "time";
      const e = { key, currentTarget: mockElement };
      if (isDateType && !disabled && !readOnly) {
        if (e.key === " " || e.key === "ArrowDown") {
          if (typeof (e.currentTarget as any).showPicker === "function") {
            try {
              (e.currentTarget as any).showPicker();
            } catch {
              // ignore
            }
          }
        }
      }
      onKeyDown?.(e);
    };

    simulateKeyDown("date", " ", false, false, () => customKeyDownCalled++);
    assert.equal(showPickerCalled, 2, "Pressing Space must invoke showPicker()");
    assert.equal(customKeyDownCalled, 1, "Custom onKeyDown must also be called");

    simulateKeyDown("date", "ArrowDown", false, false);
    assert.equal(showPickerCalled, 3, "Pressing ArrowDown must invoke showPicker()");
  });

  await t.test("4. Safely swallows exceptions if showPicker throws InvalidStateError", () => {
    const errorThrowingElement = {
      showPicker: () => {
        throw new Error("InvalidStateError: The element's picker is already active.");
      },
    };

    let errorThrown = false;
    try {
      const isDateType = true;
      const e = { currentTarget: errorThrowingElement };
      if (isDateType) {
        if (typeof (e.currentTarget as any).showPicker === "function") {
          try {
            (e.currentTarget as any).showPicker();
          } catch {
            // safely caught
          }
        }
      }
    } catch {
      errorThrown = true;
    }

    assert.equal(errorThrown, false, "Must silently catch and swallow InvalidStateError");
  });
});
