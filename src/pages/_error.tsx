import React from "react";
import type { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
  message?: string;
}

export default function ErrorPage({ statusCode, message }: ErrorProps) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8fafc",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: "16px",
      color: "#0f172a",
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        backgroundColor: "#ffffff",
        padding: "32px",
        borderRadius: "16px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
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
        <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0" }}>
          {statusCode ? `Error ${statusCode}` : "Hospital System Error"}
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 24px 0", lineHeight: "1.5" }}>
          {message || (statusCode === 404 ? "The requested medical resource was not found." : "An unexpected hospital server error occurred.")}
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Return to Hospital System
        </a>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
