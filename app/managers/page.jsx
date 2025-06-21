import { Suspense } from "react";
import ContactUsManager from "@/components/ContactUsManager";

export default function ContactPageManager() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
            Contact Us
          </h1>
          <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8 animate-pulse">
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-20 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="mb-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-32 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="flex justify-center">
              <div className="h-12 bg-blue-300 rounded-lg w-24"></div>
            </div>
          </div>
        </div>
      }
    >
      <ContactUsManager />
    </Suspense>
  );
}