import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import ClientProvider from "./ClientProvider";
const inter = Inter({ subsets: ["latin"] });
import Header from "./components/Header";


export const metadata = {
  title: "Brightland Rentals",
  description: "Apartments and commercial rentals",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProvider>
          <Header />
          {children}
        </ClientProvider>
        <footer>
          <div> &copy;Bright Land Apartments 2023 </div>
          <div>Site By: TeamVCorp.</div>
        </footer>
      </body>
    </html>
  );
}
