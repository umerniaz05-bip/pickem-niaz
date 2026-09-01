"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717a", marginBottom: "1rem" }}>
            Please reload the app.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 1.5rem",
              borderRadius: 12,
              border: "none",
              background: "#18181b",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
