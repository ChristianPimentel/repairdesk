
import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Admin } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        const q = query(collection(db, "admins"), where("email", "==", email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        const adminDoc = querySnapshot.docs[0];
        const admin = adminDoc.data() as Admin;

        if (admin.password === password) {
            // Note: We are not sending the full admin object back for security.
            // The client-side will receive the name from the UserContext after successful login.
            return NextResponse.json({ success: true, forcePasswordChange: admin.forcePasswordChange || false }, { status: 200 });
        } else {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

    } catch (error) {
        console.error("API Login Error: ", error);
        return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
