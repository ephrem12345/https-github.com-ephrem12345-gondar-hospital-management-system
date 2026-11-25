"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>GHMS - System Recovery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1e293b",
      }}>
        <main style={{
          maxWidth: "480px",
          width: "90%",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0", color: "#0f172a" }}>
            Hospital System Notice
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5", margin: "0 0 24px 0" }}>
            A critical system interface error was caught. You can retry to restore the session or return to the main portal.
          </p>
          {error?.digest && (
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 20px 0", fontFamily: "monospace" }}>
              Reference ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                backgroundColor: "#f1f5f9",
                color: "#334155",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Return Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
