"use client";

import { useState } from "react";

export default function VerifyIdPage() {
  const [loading, setLoading] = useState(false);

  // This function is called when the user clicks "Start Verification"
  const handleStartVerification = async () => {
    setLoading(true);

    // 1. Call your backend API to create a Stripe Identity session
    const response = await fetch("/api/stripe/create-identity-session", {
      method: "POST",
      // (optionally include user session info if needed)
    });

    const data = await response.json();

    // 2. Redirect the user to Stripe's verification flow
    // data.url should be the Stripe-hosted verification URL
    if (data.url) {
      window.location.href = data.url;
    } else {
      // handle error
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Verify your identity</h1>
      <p>
        You must verify your identity with a government-issued ID before using the app.
      </p>
      <button onClick={handleStartVerification} disabled={loading}>
        {loading ? "Starting..." : "Start Verification"}
      </button>
    </div>
  );
}
