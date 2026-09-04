"use client";

/**
 * Last-resort fallback for errors thrown by the root layout itself, which the
 * route-level error boundaries cannot catch. This file replaces the root layout
 * when active, so it must render its own <html>/<body> and cannot rely on
 * globals.css. Kept deliberately minimal and self-contained.
 */
export default function GlobalError({ error, retry }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          color: "#2a2e3f",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <title>Something went wrong | CourseFlow</title>
          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "#000000",
            }}
          >
            Oops, something went wrong
          </h1>
          <p
            style={{
              margin: "1rem 0 2.5rem",
              fontSize: "20px",
              lineHeight: 1.5,
              color: "#646d89",
            }}
          >
            We could not load this page. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: "60px",
              minWidth: "12.0625rem",
              padding: "0 2rem",
              border: "none",
              borderRadius: "0.5rem",
              backgroundColor: "#2f5fac",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
