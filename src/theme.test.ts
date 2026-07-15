import { describe, it, expect, beforeEach } from "vitest";
import { resolveMode, getStoredMode, applyMode } from "./theme";

describe("resolveMode", () => {
  it("returns explicit mode for light/dark", () => {
    expect(resolveMode("light")).toBe("light");
    expect(resolveMode("dark")).toBe("dark");
  });

  it("resolves system mode via matchMedia (dark)", () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    expect(resolveMode("system")).toBe("dark");
  });

  it("resolves system mode via matchMedia (light)", () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    expect(resolveMode("system")).toBe("light");
  });
});

describe("getStoredMode", () => {
  beforeEach(() => localStorage.clear());

  it("returns a valid stored value", () => {
    localStorage.setItem("pinpaste-theme-mode", "dark");
    expect(getStoredMode()).toBe("dark");
  });

  it("falls back to system for an invalid value", () => {
    localStorage.setItem("pinpaste-theme-mode", "neon");
    expect(getStoredMode()).toBe("system");
  });

  it("falls back to system when nothing is stored", () => {
    expect(getStoredMode()).toBe("system");
  });
});

describe("applyMode", () => {
  beforeEach(() => localStorage.clear());

  it("sets data-theme and persists the mode", () => {
    applyMode("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("pinpaste-theme-mode")).toBe("dark");
  });
});
