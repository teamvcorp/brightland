import React from "react";
import { resRentalList, commRentalList } from "@/public/data/data";

const Rentals = () => {
  const resList = resRentalList.map((listing, idx) => {
    return <li key={idx}>{listing.name} {listing.Sqft} {listing.status}</li>;
  });
  const commList = commRentalList.map((listing, idx) => {
    return <li key={idx}>{listing.name} {listing.Sqft} {listing.status}</li>;
  });
  return (
    <>
    <div>
      <h1>Residential Listings</h1>
      <ul>{resList}</ul>
    </div>
    <div>
      <h1>Commercial Listings</h1>
      <ul>{commList}</ul>
    </div>
    </>
  );
};

export default Rentals;
