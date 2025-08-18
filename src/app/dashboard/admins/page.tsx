
'use client';

import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserPlus, X, Check, KeyRound, Shield, QrCode } from 'lucide-react';
import type { Admin } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useUser } from '@/context/UserContext';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';

export default function AdminsPage() {
    const { user, admins } = useUser();
    const [email, setEmail] = useState('');
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
    const [editedEmail, setEditedEmail] = useState('');

    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [currentAdminInfo, setCurrentAdminInfo] = useState<{ email: string, pass: string } | null>(null);
    const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);

    const { toast } = useToast();

    const generatePassword = () => {
        const length = 8;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    }

    const showQrCodeDialog = async (adminEmail: string, tempPass: string) => {
        const loginUrl = `${window.location.origin}/?email=${encodeURIComponent(adminEmail)}&password=${encodeURIComponent(tempPass)}`;
        const qrUrl = await QRCode.toDataURL(loginUrl);
        setQrCodeUrl(qrUrl);
        setCurrentAdminInfo({ email: adminEmail, pass: tempPass });
        setIsQrDialogOpen(true);
    }

    const handleAddAdmin = async () => {
        if (!email) {
            toast({ title: 'Missing Information', description: 'Please provide an email.', variant: 'destructive' });
            return;
        }
        if (admins.some(a => a.email.toLowerCase() === email.toLowerCase())) {
            toast({ title: 'Email exists', description: 'An admin with this email already exists.', variant: 'destructive' });
            return;
        }

        const tempPassword = generatePassword();
        const newAdmin = {
            email: email.toLowerCase(),
            password: tempPassword,
            forcePasswordChange: true,
        };

        try {
            await addDoc(collection(db, 'admins'), newAdmin);
            setIsAddAdminDialogOpen(false); // Close add dialog
            showQrCodeDialog(email, tempPassword);
            setEmail('');
        } catch (error) {
            console.error("Error adding admin: ", error);
            toast({ title: 'Error', description: 'Could not add admin.', variant: 'destructive' });
        }
    };

    const handleDeleteAdmin = async (id: string) => {
        if (admins.length <= 1) {
            toast({ title: 'Cannot Delete', description: 'You cannot delete the last admin.', variant: 'destructive' });
            return;
        }
        try {
            await deleteDoc(doc(db, 'admins', id));
            toast({ title: 'Admin Removed', description: `The admin has been removed.`, variant: 'destructive' });
        } catch (error) {
            console.error("Error deleting admin: ", error);
            toast({ title: 'Error', description: 'Could not remove admin.', variant: 'destructive' });
        }
    };

    const handleEditAdmin = (admin: Admin) => {
        setEditingAdmin(admin);
        setEditedEmail(admin.email);
    };

    const handleCancelEdit = () => {
        setEditingAdmin(null);
        setEditedEmail('');
    };

    const handleUpdateAdmin = async () => {
        if (!editingAdmin) return;

        if (!editedEmail) {
            toast({ title: 'Missing Information', description: 'Please provide an email.', variant: 'destructive' });
            return;
        }
        if (editedEmail.toLowerCase() !== editingAdmin.email.toLowerCase() && admins.some(a => a.email.toLowerCase() === editedEmail.toLowerCase())) {
            toast({ title: 'Email exists', description: 'An admin with this email already exists.', variant: 'destructive' });
            return;
        }

        try {
            const adminRef = doc(db, 'admins', editingAdmin.id);
            await updateDoc(adminRef, { email: editedEmail.toLowerCase() });
            toast({ title: 'Admin Updated', description: `The admin's email has been updated.` });
            handleCancelEdit();
        } catch (error) {
            console.error("Error updating admin: ", error);
            toast({ title: 'Error', description: 'Could not update admin.', variant: 'destructive' });
        }
    };

    const handleResetPassword = async (admin: Admin) => {
        const newPassword = generatePassword();
        try {
            const adminRef = doc(db, 'admins', admin.id);
            await updateDoc(adminRef, { password: newPassword, forcePasswordChange: true });
            showQrCodeDialog(admin.email, newPassword);
        } catch (error) {
            console.error("Error resetting password: ", error);
            toast({ title: 'Error', description: 'Could not reset password.', variant: 'destructive' });
        }
    }

    if (user?.role !== 'Admin') {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not have permission to view this page.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <Card>
                <CardHeader>
                    <CardTitle>Manage Admins</CardTitle>
                    <CardDescription>
                        Add, edit, or remove system administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Shield className="mr-2 h-4 w-4" />
                                        Add Admin
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Admin</DialogTitle>
                                        <DialogDescription>
                                            Enter the email for the new administrator. They will be given a temporary password.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="adminEmail">Email</Label>
                                            <Input id="adminEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., admin@example.com"/>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button" variant="secondary">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleAddAdmin}>
                                            Add Admin
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-medium text-lg">Admin List</h3>
                            <ScrollArea className="h-96 rounded-md border">
                                <div className="p-4 space-y-2">
                                {admins.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No admins found.</p>
                                ) : (
                                    admins.map((admin) => (
                                        editingAdmin?.id === admin.id ? (
                                            <div key={admin.id} className="flex flex-col gap-2 rounded-md border p-3 bg-secondary/50">
                                                <Input type="email" value={editedEmail} onChange={e => setEditedEmail(e.target.value)} placeholder="Email"/>
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <Button variant="ghost" size="icon" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={handleUpdateAdmin}><Check className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div key={admin.id} className="flex items-center justify-between rounded-md border p-3">
                                                <div>
                                                    <p className="font-medium">{admin.email}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => showQrCodeDialog(admin.email, admin.password || '')}>
                                                        <QrCode className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleResetPassword(admin)}>
                                                        <KeyRound className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditAdmin(admin)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAdmin(admin.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    ))
                                )}
                                </div>
                            </ScrollArea>
                        </div>

                        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                            <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Admin Onboarding</DialogTitle>
                                <DialogDescription>
                                    Have the admin scan this QR code to log in and change their password.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center p-4 gap-4">
                                {qrCodeUrl && <Image src={qrCodeUrl} alt="Admin Login QR Code" width={250} height={250} />}
                                {currentAdminInfo && (
                                    <div className="text-center">
                                        <p className="font-medium">{currentAdminInfo.email}</p>
                                        <p className="text-sm text-muted-foreground">Temporary Password:</p>
                                        <p className="text-lg font-mono bg-muted p-2 rounded-md">{currentAdminInfo.pass}</p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" size="sm">Close</Button>
                                </DialogClose>
                            </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
