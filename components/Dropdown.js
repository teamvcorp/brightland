import React from "react";

const Dropdown = () => {
  return (
    <div className="headerNavContainer">
      <ul>
        <li>
          <button className="headerNav">AVAILABLE</button>
        </li>
        <li>
          <button className="headerNav">AMENITIES</button>
        </li>
        <li>
          <button className="headerNav">GALLERY</button>
        </li>
        <li>
          <button className="headerNav">NEIGHBORHOOD</button>
        </li>
        <li>
          <button className="headerNav">RESIDENTS</button>
        </li>
        <li>
          <button className="headerNav">CONTACT</button>
        </li>
      </ul>
    </div>
  );
};

export default Dropdown;
