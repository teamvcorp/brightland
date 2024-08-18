import React from "react";
import { resRentalList, commRentalList } from "@/public/data/data";

const Rentals = () => {
  const resList = resRentalList.map((listing, idx) => {
    return (
      <tr class="bg-white border-b hover:bg-gray-50" key={idx}>
        <td class="py-4 px-6">{listing.name}</td>
        <td class="py-4 px-6">{listing.Sqft}</td>
        <td class="py-4 px-6">{listing.desc}</td>
        <td class="py-4 px-6">{listing.rent}</td>
        <td class="py-2 px-3 hidden sm:table-cell">{listing.extraAdult}</td>
        <td class="py-2 px-3 hidden sm:table-cell">{listing.ammenities}</td>
        <td class="py-4 px-6">{listing.status}</td>
      </tr>
    );
  });
  const commList = commRentalList.map((listing, idx) => {
    return (
      <li key={idx}>
        {listing.name} {listing.Sqft} {listing.status}
      </li>
    );
  });
  return (
    <>
      <div class="overflow-x-auto relative shadow-md sm:rounded-lg">
        <table class="w-full text-xs sm:text-sm text-left text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" class="py-3 px-6">
                Name
              </th>
              <th scope="col" class="py-3 px-6">
                Sqft
              </th>
              <th scope="col" class="py-3 px-6">
                Description
              </th>
              <th scope="col" class="py-3 px-6">
                Base Rent
              </th>
              <th scope="col" class="py-2 px-3 hidden sm:table-cell">
                Extra Adult
              </th>
              <th scope="col" class="py-2 px-3 hidden sm:table-cell">
                Ammenities
              </th>
              <th scope="col" class="py-3 px-6">
                Status
              </th>
            </tr>
          </thead>
          <tbody>{resList}</tbody>
        </table>
      </div>
    </>
  );
};

export default Rentals;
