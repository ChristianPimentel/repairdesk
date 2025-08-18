
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type TempUser = {
    email: string;
    role: 'Student' | 'Admin';
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempUser, setTempUser] = useState<TempUser | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('tempUser');
    if (storedUser) {
      setTempUser(JSON.parse(storedUser));
    } else {
      router.push('/');
    }
  }, [router]);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter and confirm your new password.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please ensure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (tempUser) {
        try {
            const collectionName = tempUser.role === 'Admin' ? 'admins' : 'technicians';
            const q = query(collection(db, collectionName), where("email", "==", tempUser.email.toLowerCase()));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                toast({ title: 'Error', description: 'Could not find user to update.', variant: 'destructive' });
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, collectionName, userDoc.id);

            await updateDoc(userRef, {
                password: newPassword, // In a real app, this would be hashed
                forcePasswordChange: false,
            });

            toast({
                title: 'Password Changed',
                description: 'Your password has been updated successfully. Please log in again.',
            });
            
            sessionStorage.removeItem('tempUser');
            router.push('/');

        } catch (error) {
            console.error("Error updating password: ", error);
            toast({ title: 'Error', description: 'Could not update password.', variant: 'destructive' });
        }
    }
  };

  if (!tempUser) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div>Loading...</div>
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Change Your Password</CardTitle>
          <CardDescription>
            This is your first time logging in. Please set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handleChangePassword} className="w-full">
            Set New Password
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
