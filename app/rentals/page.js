"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import Image from "next/image";

// Reusable modal component for enlarged image
const ImageModal = ({ isOpen, imageSrc, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-3xl w-full m-4" onClick={(e) => e.stopPropagation()}>
        <Image
          src={imageSrc}
          alt="Enlarged view"
          width={800}
          height={600}
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
    const listingType = listing.type || "residential";
    router.push(`/contact?listingName=${encodeURIComponent(listing.name)}&listingType=${encodeURIComponent(listingType)}`);
  };

  return (
    <>
      <tr className="bg-white border-b hover:bg-gray-100 transition-colors duration-200">
        <td className="py-4 px-6 font-medium text-gray-900">{listing.name}</td>
        <td className="py-4 px-6">{listing.sqft}</td>
        <td className="py-4 px-6 text-gray-600">{listing.description}</td>
        <td className="py-4 px-6">${listing.rent?.toLocaleString()}</td>
        {showExtraAdult && (
          <td className="py-4 px-6 hidden sm:table-cell">${listing.extraAdult || 0}</td>
        )}
        <td className="py-4 px-6">
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
              listing.status === "available"
                ? "bg-green-100 text-green-800"
                : listing.status === "rented"
                ? "bg-blue-100 text-blue-800"
                : listing.status === "under-remodel"
                ? "bg-purple-100 text-purple-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {listing.status === "under-remodel" ? "Under Remodel" : listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </td>
        <td className="py-4 px-6 flex items-center space-x-2">
          <button onClick={handleImageClick} className="focus:outline-none">
            <Image
              src={listing.picture || "https://via.placeholder.com/100x60"}
              alt={listing.name}
              width={64}
              height={40}
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
const ListingTable = ({ title, listings, showExtraAdult = true }) => {
  const availableListings = listings.filter(listing => listing.status === "available");
  
  return (
    <div className="mb-8 bg-white rounded-xl shadow-lg overflow-hidden">
      <h3 className="text-xl font-bold text-gray-800 bg-gray-50 p-4 border-b border-gray-200 text-center">
        {title} ({availableListings.length} available)
      </h3>
      {availableListings.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p className="text-lg">No available properties found for this category.</p>
          <p className="text-sm mt-2">Try selecting a different property owner or check back later.</p>
        </div>
      ) : (
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
              {availableListings.map((listing, idx) => (
                <ListingRow key={listing._id || idx} listing={listing} showExtraAdult={showExtraAdult} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Rentals = () => {
  const [properties, setProperties] = useState([]);
  const [propertyOwners, setPropertyOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fetch properties from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/properties');
        if (response.ok) {
          const data = await response.json();
          // Ensure data is an array before setting it
          if (Array.isArray(data)) {
            setProperties(data);
          } else {
            console.error('Properties data is not an array:', data);
            setProperties([]);
          }
        } else {
          console.error('Failed to fetch properties');
          setProperties([]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Fetch property owners for the dropdown
  useEffect(() => {
    const fetchPropertyOwners = async () => {
      try {
        const response = await fetch('/api/property-owners');
        if (response.ok) {
          const data = await response.json();
          // Ensure data is an array before setting it
          if (Array.isArray(data)) {
            setPropertyOwners(data);
          } else {
            console.error('Property owners data is not an array:', data);
            setPropertyOwners([]);
          }
        } else {
          console.error('Failed to fetch property owners');
          setPropertyOwners([]);
        }
      } catch (error) {
        console.error('Error fetching property owners:', error);
        setPropertyOwners([]);
      }
    };

    fetchPropertyOwners();
  }, []);

  // Filter properties by type and selected owner
  const getFilteredProperties = (type) => {
    let filtered = properties.filter(property => property.type === type);
    
    if (selectedOwner !== 'all') {
      filtered = filtered.filter(property => property.ownerName === selectedOwner);
    }
    
    return filtered;
  };

  const resRentalList = getFilteredProperties('residential');
  const commRentalList = getFilteredProperties('commercial');
  const houseRentalList = getFilteredProperties('house');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header and Owner Filter */}
      <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          Available Rental Properties
        </h1>
        
        {/* Property Owner Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <label htmlFor="owner-select" className="text-lg font-medium text-gray-700">
            Filter by Property Owner:
          </label>
          <select
            id="owner-select"
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-48"
          >
            <option value="all">All Property Owners</option>
            {propertyOwners.map((owner) => (
              <option key={owner._id} value={owner.name}>
                {owner.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Show selected owner info */}
        {selectedOwner !== 'all' && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Showing properties owned by: {selectedOwner}
            </span>
          </div>
        )}
      </div>

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