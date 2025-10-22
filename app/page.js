"use client"// pages/index.jsx  (or wherever this component lives)
import React, { useState } from "react";
import Image from "next/image";
import Dropdown from "../app/components/Dropdown";

import { FaHome, FaPhone, FaTools } from "react-icons/fa";
import { FaBuildingUser } from "react-icons/fa6";
import Link from "next/link";

export default function Home() {
  // collapsed state controls whether the mobile clamp is active
  const [collapsed, setCollapsed] = useState(true);

  // handle click on the Read more link: prevent navigation and expand inline
  const handleReadMoreClick = (e) => {
    // if user clicks with keyboard or mouse, prevent default to expand inline
    // the anchor still has an href for no-JS fallback / SEO
    e.preventDefault();
    setCollapsed(false);
  };

  return (
    <main className="bg-gray-100">
      {/* Welcome Section */}
      <section className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            Welcome to Brightland Management
          </h1>
          <h2 className="text-2xl md:text-2xl text-gray-700">
            Discover Your Ideal Home in the Heart of Storm Lake!
          </h2>

          {/* clamp container */}
          <div className="relative clamp-container">
            {/* paragraph: clamp on mobile only; we toggle the class inlined with collapsed state */}
            <p
              className={
                "text-lg font-light text-gray-600 clamp-paragraph pr-16  " +
                (collapsed ? "line-clamp-4 md:line-clamp-none" : "md:line-clamp-none")
              }
            >
              Are you ready to embrace a unique blend of urban convenience and
              serene lakeside living? Look no further! Our quaint apartment
              building in Storm Lake offers the perfect balance of comfort,
              community, and convenience. Don’t miss out on the opportunity to
              live in the heart of this beautiful town. Whether you’re a
              professional, a student, or someone looking for a peaceful
              lakeside retreat, Brightland Apartments on Lake Avenue has
              something for everyone.
            </p>

            {/* Mobile-only overlay read more / show less */}
            {collapsed ? (
              <a
                href="/rentals" // no-JS fallback: navigates to rentals page
                onClick={handleReadMoreClick}
                className="  py-1 rounded text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 md:hidden"
                aria-expanded="false"
                aria-label="Read full description"
              >
                Read More
              </a>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className="md:hidden md:inline-block mt-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300"
                // On mobile after expanding we keep the "Show less" control available in DOM order if you want.
                // If you'd rather keep a mobile "Show less" button visible, change `hidden` to `absolute ... md:hidden` and style accordingly.
                aria-expanded="true"
              >
                Show less
              </button>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-800">Contact Us Today!</h3>
        </div>

        <div className="max-w-xs md:max-w-sm w-full">
          <Image
            className="object-cover w-full h-full rounded-lg shadow-lg"
            src="/kitchen.jpg"
            alt="Apartment Building"
            layout="responsive"
            width={700}
            height={466}
          />
        </div>
      </section>

      {/* Navigation Section */}
      <section className="py-6 bg-white shadow">
        <div className="grid grid-cols-2 gap-4 md:flex md:justify-around max-w-md md:max-w-full mx-auto text-center pb-5">
          <Link href="/rentals" className="flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-300">
            <FaHome size={50} color="#54738e" />
            <h1 className="text-lg font-semibold">Rentals</h1>
          </Link>

          <Link href="/managers" className="flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-300">
            <FaBuildingUser size={50} color="#54738e" />
            <h1 className="text-lg font-semibold">Property Managers</h1>
          </Link>

          <Link href="/owners" className="flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-300">
            <FaTools size={50} color="#54738e" />
            <h1 className="text-lg font-semibold">Home Repairs</h1>
          </Link>

          <Link href="/contact" className="flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-300">
            <FaPhone size={50} color="#54738e" />
            <h1 className="text-lg font-semibold">Contact</h1>
          </Link>
        </div>
      </section>
    </main>
  );
}
