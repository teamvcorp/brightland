import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header>
          <img className="logo" src="/Logo3Sun.gif" alt="Bright Land Logo" />
          <div className="headerBtnContainer">
            <button className="payBtn btn">PAY MY RENT</button>
            <Link href='/enroll'>
            <button className="scheduleBtn btn">SCHEDULE TOUR</button>
            </Link>
          </div>
        </header>
        {children}
        <footer>
          <div> &copy;Bright Land Apartments 2023 </div>
          <div>Managed By: The Von Der Becke Academy Corp.</div>
        </footer>
      </body>
    </html>
  );
}
