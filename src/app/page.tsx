
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CustomIcon } from '@/components/icons/custom-icon';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, loading, technicians } = useUser();
  const { toast } = useToast();
  const [role, setRole] = useState<'Admin' | 'Student'>('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // One-time check to ensure a default admin exists if the collection is empty
  useEffect(() => {
    const setupDefaultAdmin = async () => {
        try {
            const adminsCollection = collection(db, 'admins');
            const snapshot = await getDocs(adminsCollection);
            if (snapshot.empty) {
                console.log("No admins found, creating default admin.");
                await addDoc(adminsCollection, {
                    email: 'admin@example.com',
                    password: 'password',
                    forcePasswordChange: true,
                });
                console.log("Default admin created.");
            }
        } catch (error) {
            console.error("Error setting up default admin: ", error);
        }
    };
    setupDefaultAdmin();
  }, []);

  useEffect(() => {
    const prefillEmail = searchParams.get('email');
    const prefillPassword = searchParams.get('password');
    if (prefillEmail) {
        setEmail(prefillEmail);
        setRole('Student');
    }
    if (prefillPassword) {
        setPassword(prefillPassword);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    if (role === 'Admin') {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.forcePasswordChange) {
                    sessionStorage.setItem('tempUser', JSON.stringify({ email, role: 'Admin' }));
                    router.push('/change-password');
                } else {
                    login({ email, role: 'Admin' });
                    router.push('/dashboard');
                }
            } else {
                toast({
                    title: 'Invalid Credentials',
                    description: data.message || 'Please check your email and password.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Login Error',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'destructive',
            });
        }
    } else { // Student Login
        const technician = technicians.find(tech => tech.email.toLowerCase() === email.toLowerCase());
        
        if (technician && technician.password === password) {
            if (technician.forcePasswordChange) {
                sessionStorage.setItem('tempUser', JSON.stringify({ email, role: 'Student' }));
                router.push('/change-password');
            } else {
                login({ email, role: 'Student' });
                router.push('/dashboard');
            }
        } else {
            toast({
                title: 'Invalid Credentials',
                description: 'Please check your email and password.',
                variant: 'destructive',
            });
        }
    }
  };
  
  if (loading || (!loading && user)) {
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
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary p-3 text-primary-foreground">
              <CustomIcon className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">RepairDesk Lite</CardTitle>
          <CardDescription>
            Select a role to sign in to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="role">Select Role</Label>
                <Select value={role} onValueChange={(value) => {
                    setRole(value as 'Admin' | 'Student');
                    setEmail('');
                    setPassword('');
                }}>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
        
          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    )
}
