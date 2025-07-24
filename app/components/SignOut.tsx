import { signOut } from "next-auth/react";

export default function SignOut() {
    return (
        <button
            onClick={() => signOut()}
            style={{
                padding: "0.5rem 1rem",
                background: "#e53e3e",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
            }}
        >
            Sign Out
        </button>
    );
}