import { afterEach, describe, expect, it, vi } from "vitest";
import { startVoiceInput, supportsVoiceInput } from "./voiceInput";

describe("voice input", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
  });

  it("transcribes a final browser speech result", () => {
    const start = vi.fn();
    class FakeRecognition {
      lang = "";
      continuous = true;
      interimResults = true;
      onresult?: (event: unknown) => void;
      onerror?: (event: unknown) => void;
      onend?: () => void;
      start = start;
      stop = vi.fn();
    }
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: FakeRecognition });
    const onTranscript = vi.fn();
    const session = startVoiceInput({ onTranscript, onEnd: vi.fn(), onError: vi.fn() });

    expect(supportsVoiceInput()).toBe(true);
    expect(start).toHaveBeenCalledOnce();
    session.recognition.onresult?.({ results: [[{ transcript: "Dinner with friends" }]] });
    expect(onTranscript).toHaveBeenCalledWith("Dinner with friends");
  });
});
