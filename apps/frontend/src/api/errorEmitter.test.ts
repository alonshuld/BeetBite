import { describe, it, expect, vi, afterEach } from "vitest";
import { setErrorListener, emitApiError } from "./errorEmitter";

afterEach(() => {
  // Reset the module-level singleton between tests.
  setErrorListener(null);
});

describe("errorEmitter", () => {
  it("forwards emitted messages to the registered listener", () => {
    const listener = vi.fn();
    setErrorListener(listener);
    emitApiError("boom");
    expect(listener).toHaveBeenCalledWith("boom");
  });

  it("does nothing (and does not throw) when no listener is registered", () => {
    expect(() => emitApiError("no one is listening")).not.toThrow();
  });

  it("stops delivering after the listener is cleared with null", () => {
    const listener = vi.fn();
    setErrorListener(listener);
    setErrorListener(null);
    emitApiError("after clear");
    expect(listener).not.toHaveBeenCalled();
  });

  it("only the most recently registered listener receives the message", () => {
    const first = vi.fn();
    const second = vi.fn();
    setErrorListener(first);
    setErrorListener(second);
    emitApiError("latest only");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("latest only");
  });
});
