import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { setErrorListener, emitApiError } from "./errorEmitter";

afterEach(() => {
  // Reset the module-level singleton between tests.
  setErrorListener(null);
});

describe("errorEmitter", () => {
  it("forwards emitted messages to the registered listener", () => {
    const listener = vi.fn();
    setErrorListener(listener);
    emitApiError({ status: 400, message: "boom" });
    expect(listener).toHaveBeenCalledWith({ status: 400, message: "boom" });
  });

  it("does nothing (and does not throw) when no listener is registered", () => {
    expect(() => emitApiError({ status: 500 })).not.toThrow();
  });

  it("stops delivering after the listener is cleared with null", () => {
    const listener = vi.fn();
    setErrorListener(listener);
    setErrorListener(null);
    emitApiError({ status: 500 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("only the most recently registered listener receives the message", () => {
    const first = vi.fn();
    const second = vi.fn();
    setErrorListener(first);
    setErrorListener(second);
    emitApiError({ status: 409, code: "X" });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ status: 409, code: "X" });
  });
});
