import Image from "next/image";
import styles from "./page.module.css";
import Dropdown from "@/components/Dropdown";

import { FaHome, FaWifi, FaPhone  } from "react-icons/fa";
import { GiModernCity } from "react-icons/gi";


export default function Home() {
  return (
    <>
      <main>
        <section className="landingSectionWelcome">
        <div className="txtContainer">
        <div className="txtContent">
          <h1>Welcome to Brightland Apartments on Lake Avenue.</h1>
          <h2> Discover Your Ideal Home in the Heart of Storm Lake!</h2>
          <p className="landingP">
            {" "}
            Are you ready to embrace a unique blend of urban convenience and
            serene lakeside living? Look no further! Our quaint apartment
            building in Storm Lake offers the perfect balance of comfort,
            community, and convenience. Don’t miss out on the opportunity to
            live in the heart of this beautiful town. Whether you’re a
            professional, a student, or someone looking for a peaceful lakeside
            retreat, Brightland Apartments on Lake Avenue has something for
            everyone.
          </p>
          <h3 className="landingH3">
            Contact Us Today! 
          </h3>
        </div>
        <div>
          <img className="landingImg" src="/kitchen.jpg" alt="Apartment Building" />
        </div>
        </div>
        </section>

        <section className="landingSectionNav">

        <span> <FaHome size={50} /><h1>Rentals</h1></span>
        <span><FaWifi size={50}/> <h1>Amenities</h1></span>
       

        <span> <GiModernCity size={50}/> <h1>Neighborhood</h1></span>
        <span> <FaPhone size={50}/> <h1>Contact</h1></span>
      
        </section>
      </main>
      
    </>
  );
}
