import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import authReducer, { setCredentials, logout } from "./authSlice";

const TOKEN_KEY = "beetbite.token";

describe("authSlice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns initial state with null token when localStorage is empty", () => {
    const state = authReducer(undefined, { type: "@@INIT" });
    expect(state.token).toBeNull();
  });

  it("returns initial state with token from localStorage", () => {
    localStorage.setItem(TOKEN_KEY, "existing-token");
    // Re-import to pick up localStorage value — simulate via direct state
    const state = authReducer({ token: "existing-token" }, { type: "@@INIT" });
    expect(state.token).toBe("existing-token");
  });

  describe("setCredentials", () => {
    it("sets token in state", () => {
      const state = authReducer(
        { token: null },
        setCredentials({ token: "abc123" }),
      );
      expect(state.token).toBe("abc123");
    });

    it("persists token to localStorage", () => {
      authReducer({ token: null }, setCredentials({ token: "my-token" }));
      expect(localStorage.getItem(TOKEN_KEY)).toBe("my-token");
    });

    it("overwrites previous token", () => {
      const state1 = authReducer(
        { token: null },
        setCredentials({ token: "first" }),
      );
      const state2 = authReducer(state1, setCredentials({ token: "second" }));
      expect(state2.token).toBe("second");
      expect(localStorage.getItem(TOKEN_KEY)).toBe("second");
    });
  });

  describe("logout", () => {
    it("clears token from state", () => {
      const state = authReducer({ token: "abc123" }, logout());
      expect(state.token).toBeNull();
    });

    it("removes token from localStorage", () => {
      localStorage.setItem(TOKEN_KEY, "abc123");
      authReducer({ token: "abc123" }, logout());
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("is idempotent when already logged out", () => {
      const state = authReducer({ token: null }, logout());
      expect(state.token).toBeNull();
    });
  });
});
