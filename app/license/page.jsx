import { Suspense } from "react";
import LicenseAgreementForm from "@/components/LicenseAgreementForm";

export default function LicenseAgreementPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-6 sm:p-8 text-center">
          <svg
            className="animate-spin h-5 w-5 text-blue-500 mx-auto"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-gray-600 mt-2">Loading agreement form...</p>
        </div>
      }
    >
      <LicenseAgreementForm />
    </Suspense>
  );
}