import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Brightland Rentals",
  description: "Apartments and commercial rentals",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header>
          <Link href="/">
            <img className="logo" src="/Logo3Sun.gif" alt="Bright Land Logo" />
          </Link>
          <div className="headerBtnContainer">
            <Link href="/license" ><button className="payBtn btn">Apply Now</button></Link>
            <Link href="/contact">
              <button className="scheduleBtn btn">Contact Us</button>
            </Link>
          </div>
        </header>
        {children}
        <footer>
          <div> &copy;Bright Land Apartments 2023 </div>
          <div>Site By: TeamVCorp.</div>
        </footer>
      </body>
    </html>
  );
}
