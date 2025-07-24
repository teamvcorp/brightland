'use client'
import Link from 'next/link';
import SignOut from './SignOut';
import { useSession } from 'next-auth/react';
import React from 'react';


const Header = () => {
    const { data: session, status } = useSession();

    return (
        <header>
            <Link href="/">
                <img className="logo" src="/Logo3Sun.gif" alt="Bright Land Logo" />
            </Link>
            <div className="headerBtnContainer">
                {!session && (<Link href="/signup">
                    <button className="payBtn btn">Sign up</button>
                </Link>)}

                <Link href="/contact">
                    <button className="scheduleBtn btn">Contact Us</button>
                </Link>
                {status === 'authenticated' && (<SignOut />)}

            </div>
        </header>
    );
}

export default Header;