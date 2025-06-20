import Image from "next/image";
import styles from "./page.module.css";
import Dropdown from "@/components/Dropdown";

import { FaHome, FaWifi, FaPhone } from "react-icons/fa";
import { GiModernCity } from "react-icons/gi";
import Link from "next/link";

export default function Home() {
  return (
<main className="bg-gray-100">
  {/* Welcome Section */}
  <section className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row items-center gap-8">
    <div className="flex-1 space-y-4">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Welcome to Brightland Apartments on Lake Avenue.</h1>
      <h2 className="text-xl md:text-2xl text-gray-700">Discover Your Ideal Home in the Heart of Storm Lake!</h2>
      <p className="text-gray-600">
        Are you ready to embrace a unique blend of urban convenience and
        serene lakeside living? Look no further! Our quaint apartment
        building in Storm Lake offers the perfect balance of comfort,
        community, and convenience. Don’t miss out on the opportunity to
        live in the heart of this beautiful town. Whether you’re a
        professional, a student, or someone looking for a peaceful
        lakeside retreat, Brightland Apartments on Lake Avenue has
        something for everyone.
      </p>
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
    <Link href="/rentals" className="flex flex-col items-center gap-2">
      <FaHome size={50} color="#54738e" />
      <h1 className="text-lg font-semibold">Rentals</h1>
    </Link>
    <Link href="/managers" className="flex flex-col items-center gap-2">
      <FaHome size={50} color="#54738e" />
      <h1 className="text-lg font-semibold">Property Managers</h1>
    </Link>
    <Link href="/owners" className="flex flex-col items-center gap-2">
      <FaHome size={50} color="#54738e" />
      <h1 className="text-lg font-semibold">Home Owners</h1>
    </Link>
    <Link href="/contact" className="flex flex-col items-center gap-2">
      <FaPhone size={50} color="#54738e" />
      <h1 className="text-lg font-semibold">Contact</h1>
    </Link>
  </div>
</section>


</main>

  );
}
