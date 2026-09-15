"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  ChatCircleDots,
  PaperPlaneRight,
  StopCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import styles from "@/app/blog/blog.module.css";
import { ChatMessageMarkdown } from "@/components/blog/chat-message-markdown";

type ChatSource = {
  title: string;
  url: string;
  language: string;
};

type ChatError = {
  code: string;
  message: string;
  retryAfter?: number;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  status: "streaming" | "complete" | "error";
  text: string;
  sources: ChatSource[];
  error?: ChatError;
};

type SsePayload = Record<string, unknown>;

const SESSION_STORAGE_KEY = "justbot-session-id";
const defaultWelcomeMessage =
  "Hi, ask me anything about Thanh's writing. You can ask in English or Vietnamese.";

type LiveChatWidgetProps = {
  launcherText?: string;
  subtitle?: string;
  variant?: "blog" | "resume";
  welcomeMessage?: string;
};

function getStoredSessionId() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
}

function getSafeSourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function getResponseError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const message = (item as Record<string, unknown>).msg;
        return typeof message === "string" ? message : null;
      })
      .filter(Boolean)
      .join(" ");
  }

  return fallback;
}

export function LiveChatWidget({
  launcherText,
  subtitle = "Ask about Thanh's notes",
  variant = "blog",
  welcomeMessage = defaultWelcomeMessage,
}: LiveChatWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 1,
      role: "assistant",
      status: "complete",
      text: welcomeMessage,
      sources: [],
    },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(getStoredSessionId);
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const nextMessageIdRef = useRef(2);
  const isStreaming = messages.some(
    (message) => message.role === "assistant" && message.status === "streaming",
  );

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeChat();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const messagesElement = messagesRef.current;
    if (isOpen && messagesElement) {
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }
  }, [isOpen, messages]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  function updateAssistant(
    assistantId: number,
    update: (message: ChatMessage) => ChatMessage,
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId ? update(message) : message,
      ),
    );
  }

  function closeChat() {
    abortControllerRef.current?.abort();
    setIsOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  function stopResponse() {
    abortControllerRef.current?.abort();
  }

  function handleSseEvent(
    record: string,
    assistantId: number,
  ): "continue" | "terminal" {
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of record.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const value = line.slice(5);
        dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
      }
    }

    if (dataLines.length === 0) return "continue";

    const payload = JSON.parse(dataLines.join("\n")) as SsePayload;

    if (eventName === "session" && typeof payload.session_id === "string") {
      setSessionId(payload.session_id);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, payload.session_id);
      return "continue";
    }

    if (eventName === "delta" && typeof payload.text === "string") {
      updateAssistant(assistantId, (message) => ({
        ...message,
        text: message.text + payload.text,
      }));
      return "continue";
    }

    if (eventName === "complete" && typeof payload.answer === "string") {
      const sources = Array.isArray(payload.sources)
        ? payload.sources.flatMap((source) => {
            if (!source || typeof source !== "object") return [];
            const item = source as Record<string, unknown>;
            if (
              typeof item.title !== "string" ||
              typeof item.url !== "string" ||
              typeof item.language !== "string"
            ) {
              return [];
            }

            const safeUrl = getSafeSourceUrl(item.url);
            return safeUrl
              ? [
                  {
                    title: item.title,
                    url: safeUrl,
                    language: item.language,
                  },
                ]
              : [];
          })
        : [];

      updateAssistant(assistantId, (message) => ({
        ...message,
        status: "complete",
        text: payload.answer as string,
        sources,
      }));
      return "terminal";
    }

    if (eventName === "error") {
      const errorMessage =
        typeof payload.message === "string"
          ? payload.message
          : "JustBot could not finish the response.";
      const retryAfter =
        typeof payload.retry_after === "number"
          ? payload.retry_after
          : undefined;

      updateAssistant(assistantId, (message) => ({
        ...message,
        status: "error",
        text: "",
        error: {
          code:
            typeof payload.code === "string" ? payload.code : "stream_error",
          message: errorMessage,
          retryAfter,
        },
      }));
      return "terminal";
    }

    return "continue";
  }

  async function streamResponse(message: string, assistantId: number) {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("text/event-stream")) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          getResponseError(payload, "JustBot returned an unexpected response."),
        );
      }

      if (!response.body) {
        throw new Error("JustBot returned an empty response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let terminalEventReceived = false;

      while (!terminalEventReceived) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const record = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          if (record.trim()) {
            terminalEventReceived =
              handleSseEvent(record, assistantId) === "terminal";
          }

          if (terminalEventReceived) break;
          boundary = buffer.indexOf("\n\n");
        }

        if (done) break;
      }

      if (!terminalEventReceived) {
        throw new Error("JustBot's response ended before it was complete.");
      }

      await reader.cancel().catch(() => undefined);
    } catch (error) {
      const wasStopped = error instanceof Error && error.name === "AbortError";
      updateAssistant(assistantId, (current) => ({
        ...current,
        status: "error",
        text: "",
        error: {
          code: wasStopped ? "cancelled" : "connection_failure",
          message: wasStopped
            ? "Response stopped."
            : error instanceof Error
              ? error.message
              : "JustBot could not be reached.",
        },
      }));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();

    if (!message || isStreaming) return;

    const userId = nextMessageIdRef.current++;
    const assistantId = nextMessageIdRef.current++;
    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        status: "complete",
        text: message,
        sources: [],
      },
      {
        id: assistantId,
        role: "assistant",
        status: "streaming",
        text: "",
        sources: [],
      },
    ]);
    setDraft("");
    void streamResponse(message, assistantId);
  }

  return (
    <div
      className={`${styles.chatWidget} ${variant === "resume" ? styles.chatWidgetResume : ""}`}
    >
      {isOpen ? (
        <section
          id={`${titleId}-panel`}
          className={styles.chatPanel}
          role="dialog"
          aria-labelledby={titleId}
          aria-modal="false"
          aria-busy={isStreaming}
        >
          <header className={styles.chatHeader}>
            <div className={styles.chatIdentity}>
              <span className={styles.chatAvatar} aria-hidden="true">
                <ChatCircleDots size={20} weight="regular" />
              </span>
              <div>
                <h2 id={titleId}>Chat with JustBot</h2>
                <p>{subtitle}</p>
              </div>
            </div>
            <button
              className={styles.chatClose}
              type="button"
              onClick={closeChat}
              aria-label="Close chat"
            >
              <X size={18} weight="regular" aria-hidden="true" />
            </button>
          </header>

          <div
            ref={messagesRef}
            className={styles.chatMessages}
            role="log"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                className={`${styles.chatMessage} ${
                  message.role === "user"
                    ? styles.chatMessageUser
                    : styles.chatMessageAssistant
                }`}
                key={message.id}
              >
                <span>{message.role === "user" ? "You" : "JustBot"}</span>
                {message.status === "error" && message.error ? (
                  <div className={styles.chatError} role="alert">
                    <WarningCircle
                      size={17}
                      weight="regular"
                      aria-hidden="true"
                    />
                    <div>
                      <p>{message.error.message}</p>
                      {message.error.retryAfter ? (
                        <small>
                          Try again in {message.error.retryAfter} seconds.
                        </small>
                      ) : null}
                    </div>
                  </div>
                ) : message.role === "assistant" && message.text ? (
                  <div className={styles.chatMarkdown}>
                    <ChatMessageMarkdown>{message.text}</ChatMessageMarkdown>
                  </div>
                ) : (
                  <p
                    className={!message.text ? styles.chatThinking : undefined}
                  >
                    {message.text || (
                      <>
                        <span>Thinking</span>
                        <span
                          className={styles.chatThinkingDots}
                          aria-hidden="true"
                        >
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </span>
                      </>
                    )}
                  </p>
                )}
                {message.sources.length > 0 ? (
                  <ul className={styles.chatSources} aria-label="Sources">
                    {message.sources.map((source) => (
                      <li key={`${source.url}-${source.title}`}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          <span>{source.title}</span>
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>

          <form className={styles.chatComposer} onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor={`${titleId}-message`}>
              Message
            </label>
            <input
              id={`${titleId}-message`}
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={600}
              placeholder={
                isStreaming ? "JustBot is replying..." : "Ask a question..."
              }
              autoComplete="off"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                className={styles.chatStop}
                type="button"
                onClick={stopResponse}
                aria-label="Stop response"
              >
                <StopCircle size={19} weight="fill" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                aria-label="Send message"
              >
                <PaperPlaneRight size={18} weight="fill" aria-hidden="true" />
              </button>
            )}
          </form>
        </section>
      ) : null}

      {!isOpen ? (
        <button
          ref={launcherRef}
          className={`${styles.chatLauncher} ${launcherText ? styles.chatLauncherWithText : ""}`}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded="false"
          aria-controls={`${titleId}-panel`}
          aria-label={launcherText ?? "Chat with JustBot"}
        >
          <ChatCircleDots size={21} weight="regular" aria-hidden="true" />
          {launcherText ? <span>{launcherText}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
