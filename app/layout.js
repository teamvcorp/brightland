import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import ClientProvider from "./ClientProvider";
const inter = Inter({ subsets: ["latin"] });
import Header from "./components/Header";
import OnboardingRedirect from "./components/OnboardingRedirect";


export const metadata = {
     title: "Brightland Rentals",
     description: "Apartments and commercial rentals",
     icons: {
       icon: [
         { url: '/favicon.ico', sizes: 'any' },
         { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
         { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
       ],
       apple: '/apple-touch-icon.png',
     },
   };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProvider>
          <OnboardingRedirect />
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
