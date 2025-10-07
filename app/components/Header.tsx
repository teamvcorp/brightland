'use client'
import Link from 'next/link';
import SignOut from './SignOut';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect } from 'react';


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
                <img className="logo" src="/Logo3Sun.gif" alt="Bright Land Logo" />
            </Link>
            <div className="headerBtnContainer">
                {!session && (<Link href="/signup">
                    <button className="payBtn btn">Sign up</button>
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