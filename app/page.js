import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <header>
        <img src="" alt="Bright Land Logo" />

        <div className="headerNavContainer">
          <button className="headerNav">FLOOR PLANS</button>
          <button className="headerNav">AMENITIES</button>
          <button className="headerNav">GALLERY</button>
          <button className="headerNav">NEIGHBORHOOD</button>
          <button className="headerNav">RESIDENTS</button>
          <button className="headerNav">CONTACT</button>
        </div>

        <div className="headerBtnContainer">
          <button className="payBtn btn">PAY MY RENT</button>
          <button className="scheduleBtn btn">SCHEDULE A TOUR</button>
        </div>
      </header>
      <main>
        <div className="txtContent">
          <h1>Welcome to Brightland Apartments on Lake Avenue.</h1>
          <h2> Discover Your Ideal Home in the Heart of Storm Lake!</h2>
          <p>
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
          <h3>
            Contact us today to schedule a viewing or for any inquiries. Your
            dream apartment is just a click away!
          </h3>
        </div>
        <div>
          <img src="" alt="Apartment Building" />
        </div>
      </main>
      <footer>
        <div> &copy;Bright Land Apartments 2023 </div>
        <div>Managed By: The Von Der Becke Academy Corp.</div>
      </footer>
    </>
  );
}
