
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
import { Pencil, Trash2, UserPlus, X, Check, ClipboardPaste, KeyRound, Phone, QrCode } from 'lucide-react';
import type { Technician } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '../ui/textarea';
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

interface TechnicianCardProps {
  technicians: Technician[];
}

export function TechnicianCard({ technicians }: TechnicianCardProps) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [bulkText, setBulkText] = useState('');
  
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentTechnicianInfo, setCurrentTechnicianInfo] = useState<{name: string, pass: string} | null>(null);

  const [isAddTechnicianDialogOpen, setIsAddTechnicianDialogOpen] = useState(false);


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
  
  const showQrCodeDialog = async (technicianName: string, technicianEmail: string, tempPass: string) => {
    const loginUrl = `${window.location.origin}/?email=${encodeURIComponent(technicianEmail)}&password=${encodeURIComponent(tempPass)}`;
    const qrUrl = await QRCode.toDataURL(loginUrl);
    setQrCodeUrl(qrUrl);
    setCurrentTechnicianInfo({ name: technicianName, pass: tempPass });
    setIsQrDialogOpen(true);
  }

  const handleAddTechnician = async () => {
    if (!name || !email) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both name and email.',
        variant: 'destructive',
      });
      return;
    }
    if (technicians.some(t => t.email.toLowerCase() === email.toLowerCase())) {
        toast({
            title: 'Email exists',
            description: 'A technician with this email already exists.',
            variant: 'destructive',
        });
        return;
    }

    const tempPassword = generatePassword();
    const newTechnician = {
      name,
      email: email.toLowerCase(),
      phone,
      password: tempPassword,
      forcePasswordChange: true,
    };

    try {
        await addDoc(collection(db, 'technicians'), newTechnician);
        setIsAddTechnicianDialogOpen(false); // Close add dialog
        showQrCodeDialog(name, email, tempPassword);
        setName('');
        setEmail('');
        setPhone('');
    } catch (error) {
        console.error("Error adding technician: ", error);
        toast({ title: 'Error', description: 'Could not add technician.', variant: 'destructive'});
    }
  };

  const handleDeleteTechnician = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'technicians', id));
        toast({
            title: 'Technician Removed',
            description: `The technician has been removed.`,
            variant: 'destructive'
        });
    } catch (error) {
        console.error("Error deleting technician: ", error);
        toast({ title: 'Error', description: 'Could not remove technician.', variant: 'destructive'});
    }
  };

  const handleEditTechnician = (technician: Technician) => {
    setEditingTechnician(technician);
    setEditedName(technician.name);
    setEditedEmail(technician.email);
    setEditedPhone(technician.phone || '');
  };
  
  const handleCancelEdit = () => {
    setEditingTechnician(null);
    setEditedName('');
    setEditedEmail('');
    setEditedPhone('');
  };

  const handleUpdateTechnician = async () => {
    if(!editingTechnician) return;
    
    if (!editedName || !editedEmail) {
        toast({
          title: 'Missing Information',
          description: 'Please provide both name and email.',
          variant: 'destructive',
        });
        return;
    }
    if(editedEmail.toLowerCase() !== editingTechnician.email.toLowerCase() && technicians.some(t => t.email.toLowerCase() === editedEmail.toLowerCase())) {
        toast({
            title: 'Email exists',
            description: 'A technician with this email already exists.',
            variant: 'destructive',
        });
        return;
    }

    try {
        const techRef = doc(db, 'technicians', editingTechnician.id);
        await updateDoc(techRef, { name: editedName, email: editedEmail.toLowerCase(), phone: editedPhone });
        toast({
            title: 'Technician Updated',
            description: `The technician's details have been updated.`,
        });
        handleCancelEdit();
    } catch (error) {
        console.error("Error updating technician: ", error);
        toast({ title: 'Error', description: 'Could not update technician.', variant: 'destructive'});
    }
  };

  const handleResetPassword = async (technician: Technician) => {
    const newPassword = generatePassword();
    try {
        const techRef = doc(db, 'technicians', technician.id);
        await updateDoc(techRef, { password: newPassword, forcePasswordChange: true });
        showQrCodeDialog(technician.name, technician.email, newPassword);
    } catch (error) {
        console.error("Error resetting password: ", error);
        toast({ title: 'Error', description: 'Could not reset password.', variant: 'destructive'});
    }
  }
  
  const handleBulkAddFromText = async () => {
    if (!bulkText.trim()) {
        toast({
            title: 'No Input',
            description: 'Please paste technician data into the text area.',
            variant: 'destructive',
        });
        return;
    }
    
    const addedTechnicians: {name: string, email: string, pass: string}[] = [];
    const duplicates: string[] = [];
    const existingEmails = new Set(technicians.map(t => t.email.toLowerCase()));
    
    const lines = bulkText.trim().split('\n');

    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            const name = parts[0];
            const email = parts[1];
            const phone = parts[2] || '';
            
            if (name && email) {
                if (!existingEmails.has(email.toLowerCase())) {
                    const tempPassword = generatePassword();
                    const newTechnician = {
                        name,
                        email: email.toLowerCase(),
                        phone,
                        password: tempPassword,
                        forcePasswordChange: true,
                    };
                    try {
                        await addDoc(collection(db, 'technicians'), newTechnician);
                        addedTechnicians.push({ name, email, pass: tempPassword });
                        existingEmails.add(email.toLowerCase());
                    } catch (e) {
                        // ignore failed adds
                    }
                } else {
                    duplicates.push(email);
                }
            }
        }
    }

    if (addedTechnicians.length > 0) {
        setIsAddTechnicianDialogOpen(false);
        const firstTech = addedTechnicians[0];
        showQrCodeDialog(firstTech.name, firstTech.email, firstTech.pass);

        if (addedTechnicians.length > 1) {
            toast({
                title: 'Multiple Technicians Added',
                description: `${addedTechnicians.length} technicians were added. Showing QR for the first one.`,
            });
        }
    }

    if (duplicates.length > 0) {
        toast({
            title: 'Some Duplicates Skipped',
            description: `${duplicates.length} technicians were not added because their email already exists.`,
            variant: 'destructive',
        });
    }
    
    setBulkText('');
  };


  return (
    <div className="space-y-6">
        <div className="flex justify-end">
            <Dialog open={isAddTechnicianDialogOpen} onOpenChange={setIsAddTechnicianDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Technician
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Technician</DialogTitle>
                        <DialogDescription>
                            Use the tabs to add a single technician or multiple at once.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="single" className="pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single"><UserPlus className="mr-2 h-4 w-4" /> Add Single</TabsTrigger>
                            <TabsTrigger value="bulk"><ClipboardPaste className="mr-2 h-4 w-4" /> Bulk Add</TabsTrigger>
                        </TabsList>
                        <TabsContent value="single">
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                <Label htmlFor="techName">Full Name</Label>
                                <Input id="techName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="techEmail">Email</Label>
                                <Input id="techEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., jane.d@example.com"/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="techPhone">Phone (Optional)</Label>
                                    <Input id="techPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 123-456-7890" />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button onClick={handleAddTechnician}>
                                    Add Technician
                                </Button>
                            </DialogFooter>
                        </TabsContent>
                        <TabsContent value="bulk">
                            <div className="space-y-4 py-4">
                                <Label htmlFor="bulk-add">Paste a list of "Name, Email, Phone" values, one per line.</Label>
                                <Textarea 
                                    id="bulk-add" 
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="John Doe,john@example.com,123-456-7890\nJane Smith,jane@example.com"
                                    rows={5}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Each line should contain the name, email, and optionally a phone number, separated by commas.
                                </p>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button onClick={handleBulkAddFromText}>Add Technicians</Button>
                            </DialogFooter>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium text-lg">Technician List</h3>
            <ScrollArea className="h-96 rounded-md border">
                <div className="p-4 space-y-2">
                {technicians.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No technicians found.</p>
                ) : (
                    technicians.map((tech) => (
                        editingTechnician?.id === tech.id ? (
                            <div key={tech.id} className="flex flex-col gap-2 rounded-md border p-3 bg-secondary/50">
                                <Input value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Full Name" />
                                <Input type="email" value={editedEmail} onChange={e => setEditedEmail(e.target.value)} placeholder="Email"/>
                                <Input type="tel" value={editedPhone} onChange={e => setEditedPhone(e.target.value)} placeholder="Phone (Optional)"/>

                                <div className="flex justify-end gap-2 mt-1">
                                    <Button variant="ghost" size="icon" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={handleUpdateTechnician}><Check className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ) : (
                            <div key={tech.id} className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <p className="font-medium">{tech.name}</p>
                                    <p className="text-sm text-muted-foreground">{tech.email}</p>
                                    {tech.phone && user?.role === 'Admin' ? (
                                        <a href={`tel:${tech.phone}`} className='flex items-center gap-2 text-sm text-primary hover:underline'>
                                            <Phone className="h-3 w-3"/> {tech.phone}
                                        </a>
                                    ) : tech.phone ? (
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Phone className="h-3 w-3"/> {tech.phone}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => showQrCodeDialog(tech.name, tech.email, tech.password || '')}>
                                        <QrCode className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleResetPassword(tech)}>
                                        <KeyRound className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleEditTechnician(tech)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTechnician(tech.id)}>
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
                <DialogTitle>Technician Onboarding</DialogTitle>
                <DialogDescription>
                    Have the technician scan this QR code to log in and change their password.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 gap-4">
                {qrCodeUrl && <Image src={qrCodeUrl} alt="Technician Login QR Code" width={250} height={250} />}
                {currentTechnicianInfo && (
                    <div className="text-center">
                        <p className="font-medium">{currentTechnicianInfo.name}</p>
                        <p className="text-sm text-muted-foreground">Temporary Password:</p>
                        <p className="text-lg font-mono bg-muted p-2 rounded-md">{currentTechnicianInfo.pass}</p>
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
  );
}

    