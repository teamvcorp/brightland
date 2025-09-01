"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { resRentalList, commRentalList, houseRentalList } from "../../public/data/data"; // Adjust the import path as necessary

// Reusable modal component for enlarged image
const ImageModal = ({ isOpen, imageSrc, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-3xl w-full m-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageSrc}
          alt="Enlarged view"
          className="w-full h-auto rounded-lg shadow-xl"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Reusable table row component
const ListingRow = ({ listing, showExtraAdult = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInquire = () => {
    const listingType = listing.type || (houseRentalList.includes(listing) ? "house" : commRentalList.includes(listing) ? "commercial" : "residential");
    router.push(`/contact?listingName=${encodeURIComponent(listing.name)}&listingType=${encodeURIComponent(listingType)}`);
  };

  return (
    <>
      <tr className="bg-white border-b hover:bg-gray-100 transition-colors duration-200">
        <td className="py-4 px-6 font-medium text-gray-900">{listing.name}</td>
        <td className="py-4 px-6">{listing.Sqft}</td>
        <td className="py-4 px-6 text-gray-600">{listing.desc}</td>
        <td className="py-4 px-6">${listing.rent.toLocaleString()}</td>
        {showExtraAdult && (
          <td className="py-4 px-6 hidden sm:table-cell">${listing.extraAdult}</td>
        )}
        <td className="py-4 px-6">
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
              listing.status === "Available"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {listing.status}
          </span>
        </td>
        <td className="py-4 px-6 flex items-center space-x-2">
          <button onClick={handleImageClick} className="focus:outline-none">
            <img
              src={listing.picture || "https://via.placeholder.com/100x60"}
              alt={listing.name}
              className="w-16 h-10 object-cover rounded hover:opacity-80 transition-opacity cursor-pointer"
            />
          </button>
          <button
            onClick={handleInquire}
            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Inquire
          </button>
        </td>
      </tr>
      <ImageModal
        isOpen={isModalOpen}
        imageSrc={listing.picture || "https://via.placeholder.com/100x60"}
        onClose={handleCloseModal}
      />
    </>
  );
};

// Reusable table component
const ListingTable = ({ title, listings, showExtraAdult = true }) => (
  <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden">
    <h3 className="text-xl font-bold text-gray-800 bg-gray-50 p-4 border-b border-gray-200 text-center">
      {title}
    </h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
          <tr>
            <th scope="col" className="py-3 px-6">Name</th>
            <th scope="col" className="py-3 px-6">Sqft</th>
            <th scope="col" className="py-3 px-6">Description</th>
            <th scope="col" className="py-3 px-6">Base Rent</th>
            {showExtraAdult && (
              <th scope="col" className="py-3 px-6 hidden sm:table-cell">Extra Adult</th>
            )}
            <th scope="col" className="py-3 px-6">Status</th>
            <th scope="col" className="py-3 px-6">Picture/Inquire</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing, idx) => (
            listing.status === "Rented" ? null :
            <ListingRow key={listing.id || idx} listing={listing} showExtraAdult={showExtraAdult} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Rentals = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <ListingTable
        title="House Listings"
        listings={houseRentalList}
        showExtraAdult={true}
      />
      <div className="mb-8">
        <ListingTable
          title="Residential Listings"
          listings={resRentalList}
          showExtraAdult={true}
        />
        <p className="text-center text-gray-600 py-4 bg-white rounded-b-xl">
          Amenities: Apartment includes Highspeed internet, onsite laundry, water and sewer
        </p>
      </div>
      <ListingTable
        title="Commercial Listings"
        listings={commRentalList}
        showExtraAdult={false}
      />
    </div>
  );
};

export default Rentals;