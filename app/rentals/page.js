import React from "react";
import { resRentalList, commRentalList } from "@/public/data/data";

const Rentals = () => {
  const resList = resRentalList.map((listing, idx) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={idx}>
        <td className="py-4 px-6">{listing.name}</td>
        <td className="py-4 px-6">{listing.Sqft}</td>
        <td className="py-4 px-6">{listing.desc}</td>
        <td className="py-4 px-6">{listing.rent}</td>
        <td className="py-2 px-3 hidden sm:table-cell">{listing.extraAdult}</td>
        <td className="py-4 px-6">{listing.status}</td>
      </tr>
    );
  });
  const commList = commRentalList.map((listing, idx) => {
    return (
      <tr className="bg-white border-b hover:bg-gray-50" key={idx}>
      <td className="py-4 px-6">{listing.name}</td>
      <td className="py-4 px-6">{listing.Sqft}</td>
      <td className="py-4 px-6">{listing.desc}</td>
      <td className="py-4 px-6">{listing.rent}</td>
      <td className="py-4 px-6">{listing.status}</td>
    </tr>

    );
  });
  return (
    <>
      <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
        <h3 className="text-center border border-gray-200 p-4">Residential Listings</h3>
        <table className="w-full text-xs sm:text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="py-3 px-6">
                Name
              </th>
              <th scope="col" className="py-3 px-6">
                Sqft
              </th>
              <th scope="col" className="py-3 px-6">
                Description
              </th>
              <th scope="col" className="py-3 px-6">
                Base Rent
              </th>
              <th scope="col" className="py-2 px-3 hidden sm:table-cell">
                Extra Adult
              </th>
              <th scope="col" className="py-2 px-3 hidden sm:table-cell">
                Ammenities
              </th>
              <th scope="col" className="py-3 px-6">
                Status
              </th>
            </tr>
          </thead>
          <tbody>{resList}</tbody>
        </table>
        <p className='text-center py-4 px-6'>Ammenities: Apartment includes Highspeed internet, onsite laundry, water and sewer</p>,
        
      </div>
      <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
        <h3 className="text-center border border-gray-200 p-4">Commercial Listings</h3>
        <table className="w-full text-xs sm:text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="py-3 px-6">
                Name
              </th>
              <th scope="col" className="py-3 px-6">
                Sqft
              </th>
              <th scope="col" className="py-3 px-6">
                Description
              </th>
              <th scope="col" className="py-3 px-6">
                Base Rent
              </th>
              <th scope="col" className="py-3 px-6">
                Status
              </th>
            </tr>
          </thead>
          <tbody>{commList}</tbody>
        </table>
      </div>
    </>
  );
};

export default Rentals;
