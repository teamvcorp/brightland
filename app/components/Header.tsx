'use client'
import Link from 'next/link';
import SignOut from './SignOut';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';


const Header = () => {
    const { data: session, status } = useSession();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (session?.user?.email) {
                try {
                    const response = await fetch('/api/admin/check-admin');
                    const data = await response.json();
                    setIsAdmin(data.isAdmin);
                } catch (error) {
                    console.error('Error checking admin status:', error);
                }
            }
        };

        checkAdminStatus();
    }, [session]);

    return (
        <header>
            <Link href="/">
                <Image
                    className="logo"
                    src="/logoBPM.svg"
                    alt="Bright Land Logo"
                    width={150}
                    height={75}
                />
            </Link>
            <div className="headerBtnContainer">
                {!session && (<Link href="/signup">
                    <button className="payBtn btn">Sign Up</button>
                </Link>)}

                <Link href="/contact">
                    <button className="scheduleBtn btn">Contact Us</button>
                </Link>
                
                {session && isAdmin && (
                    <Link href="/admin">
                        <button className="scheduleBtn btn">Admin</button>
                    </Link>
                )}
                
                {status === 'authenticated' && (<SignOut />)}

            </div>
        </header>
    );
}

export default Header;