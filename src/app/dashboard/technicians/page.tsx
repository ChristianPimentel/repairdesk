
'use client';

import React, { useState, useMemo } from 'react';
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
import { Pencil, Trash2, Check, X, FolderKanban, PlusCircle, UserPlus, KeyRound, QrCode, ClipboardPaste, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '@/context/UserContext';
import type { Group, Technician } from '@/lib/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import Image from 'next/image';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function TechniciansPage() {
    const { user, groups, technicians } = useUser();
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // Group Management State
    const [groupName, setGroupName] = useState('');
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editedGroupName, setEditedGroupName] = useState('');
    
    // Technician Management State
    const [techName, setTechName] = useState('');
    const [techEmail, setTechEmail] = useState('');
    const [techPhone, setTechPhone] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
    const [editedTechName, setEditedTechName] = useState('');
    const [editedTechEmail, setEditedTechEmail] = useState('');
    const [editedTechPhone, setEditedTechPhone] = useState('');
    const [isAddTechDialogOpen, setIsAddTechDialogOpen] = useState(false);

    // QR Code Dialog State
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [currentTechnicianInfo, setCurrentTechnicianInfo] = useState<{name: string, email: string, pass: string} | null>(null);

    const { toast } = useToast();

    // Derived State
    const filteredTechnicians = useMemo(() => {
        if (!selectedGroup) return [];
        return technicians.filter(t => (t.group || 'Default') === selectedGroup.name);
    }, [technicians, selectedGroup]);

    // Group Management Functions
    const handleAddGroup = async () => {
        if (!groupName) {
            toast({ title: 'Missing Information', description: 'Please provide a group name.', variant: 'destructive' });
            return;
        }
        if (groups.some(g => g.name.toLowerCase() === groupName.toLowerCase())) {
            toast({ title: 'Group exists', description: 'A group with this name already exists.', variant: 'destructive' });
            return;
        }
        try {
            await addDoc(collection(db, 'groups'), { name: groupName });
            toast({ title: 'Group Created', description: `The group "${groupName}" has been created.` });
            setGroupName('');
        } catch (error) {
            toast({ title: 'Error', description: 'Could not add group.', variant: 'destructive' });
        }
    };

    const handleDeleteGroup = async (group: Group) => {
        if (group.name === 'Default') {
            toast({ title: 'Cannot Delete', description: 'The "Default" group cannot be deleted.', variant: 'destructive' });
            return;
        }
        try {
            const batch = writeBatch(db);
            const techsInGroupQuery = query(collection(db, 'technicians'), where('group', '==', group.name));
            const techSnapshot = await getDocs(techsInGroupQuery);
            techSnapshot.forEach(doc => {
                batch.update(doc.ref, { group: 'Default' });
            });
            const groupRef = doc(db, 'groups', group.id);
            batch.delete(groupRef);
            await batch.commit();
            toast({ title: 'Group Deleted', description: `The group "${group.name}" has been removed.`, variant: 'destructive' });
            setSelectedGroup(null);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not remove group.', variant: 'destructive' });
        }
    };

    const handleUpdateGroup = async () => {
        if (!editingGroup || !editedGroupName) return;
        if (editedGroupName.toLowerCase() !== editingGroup.name.toLowerCase() && groups.some(a => a.name.toLowerCase() === editedGroupName.toLowerCase())) {
            toast({ title: 'Group exists', description: 'A group with this name already exists.', variant: 'destructive' });
            return;
        }
        try {
            const batch = writeBatch(db);
            const techsInGroupQuery = query(collection(db, 'technicians'), where('group', '==', editingGroup.name));
            const techSnapshot = await getDocs(techsInGroupQuery);
            techSnapshot.forEach(doc => {
                batch.update(doc.ref, { group: editedGroupName });
            });
            const groupRef = doc(db, 'groups', editingGroup.id);
            batch.update(groupRef, { name: editedGroupName });
            await batch.commit();
            toast({ title: 'Group Updated', description: `The group name has been updated.` });
            setEditingGroup(null);
            setEditedGroupName('');
            const updatedGroup = { ...editingGroup, name: editedGroupName };
            setSelectedGroup(updatedGroup);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not update group.', variant: 'destructive' });
        }
    };

    // Technician Management Functions
    const generatePassword = () => {
        const length = 8;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    }

    const showQrCodeDialog = async (name: string, email: string, pass: string) => {
        const loginUrl = `${window.location.origin}/?email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`;
        const qrUrl = await QRCode.toDataURL(loginUrl);
        setQrCodeUrl(qrUrl);
        setCurrentTechnicianInfo({ name, email, pass });
        setIsQrDialogOpen(true);
    }
    
    const handleAddTechnician = async () => {
        if (!techName || !techEmail) {
            toast({ title: 'Missing Information', description: 'Name and email are required.', variant: 'destructive' });
            return;
        }
        if (technicians.some(t => t.email.toLowerCase() === techEmail.toLowerCase())) {
            toast({ title: 'Email exists', description: 'A technician with this email already exists.', variant: 'destructive' });
            return;
        }
        const tempPassword = generatePassword();
        const newTechnician = {
            name: techName,
            email: techEmail.toLowerCase(),
            phone: techPhone,
            group: selectedGroup?.name || 'Default',
            password: tempPassword,
            forcePasswordChange: true,
        };
        try {
            await addDoc(collection(db, 'technicians'), newTechnician);
            setIsAddTechDialogOpen(false);
            showQrCodeDialog(techName, techEmail, tempPassword);
            setTechName('');
            setTechEmail('');
            setTechPhone('');
        } catch (error) {
            toast({ title: 'Error', description: 'Could not add technician.', variant: 'destructive' });
        }
    };

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
                            group: selectedGroup?.name || 'Default',
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
            setIsAddTechDialogOpen(false);
            const firstTech = addedTechnicians[0];
            showQrCodeDialog(firstTech.name, firstTech.email, firstTech.pass);
    
            toast({
                title: `${addedTechnicians.length} Technicians Added`,
                description: `Showing QR for the first one. Others can be accessed from the list.`,
            });
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

    const handleDeleteTechnician = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'technicians', id));
            toast({ title: 'Technician Removed', description: `The technician has been removed.`, variant: 'destructive' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not remove technician.', variant: 'destructive' });
        }
    };

    const handleUpdateTechnician = async (technician: Technician) => {
        if (!editedTechName || !editedTechEmail) {
            toast({ title: 'Missing Information', description: 'Name and email are required.', variant: 'destructive' });
            return;
        }
        if (editedTechEmail.toLowerCase() !== technician.email.toLowerCase() && technicians.some(t => t.email.toLowerCase() === editedTechEmail.toLowerCase())) {
            toast({ title: 'Email exists', description: 'Another technician has this email.', variant: 'destructive' });
            return;
        }
        try {
            const techRef = doc(db, 'technicians', technician.id);
            await updateDoc(techRef, { name: editedTechName, email: editedTechEmail.toLowerCase(), phone: editedTechPhone });
            toast({ title: 'Technician Updated', description: "The technician's details have been updated." });
            setEditingTechnician(null);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not update technician.', variant: 'destructive' });
        }
    };
    
    const handleResetPassword = async (technician: Technician) => {
        const newPassword = generatePassword();
        try {
            const techRef = doc(db, 'technicians', technician.id);
            await updateDoc(techRef, { password: newPassword, forcePasswordChange: true });
            showQrCodeDialog(technician.name, technician.email, newPassword);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not reset password.', variant: 'destructive' });
        }
    }


    if (user?.role !== 'Admin') {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
                    <CardContent><p>You do not have permission to view this page.</p></CardContent>
                </Card>
            </div>
        )
    }
    
    const allGroups = [{id: 'default', name: 'Default'}, ...groups];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <Card>
                <CardHeader>
                    <CardTitle>Manage Technicians & Groups</CardTitle>
                    <CardDescription>
                        Organize your technicians by creating groups and managing their members.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Groups */}
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Groups</CardTitle>
                                <div className="flex gap-2 pt-2">
                                    <Input 
                                        placeholder="New group name..."
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                                    />
                                    <Button size="icon" onClick={handleAddGroup}><PlusCircle className="h-4 w-4"/></Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-96">
                                    <div className="space-y-2">
                                    {allGroups.map((group) => (
                                        editingGroup?.id === group.id ? (
                                            <div key={group.id} className="flex items-center gap-2 rounded-md border p-3 bg-secondary/50">
                                                <FolderKanban className="h-4 w-4 text-muted-foreground"/>
                                                <Input value={editedGroupName} onChange={e => setEditedGroupName(e.target.value)} placeholder="Group Name"/>
                                                <Button variant="ghost" size="icon" onClick={() => setEditingGroup(null)}><X className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={handleUpdateGroup}><Check className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                        <div 
                                            key={group.id} 
                                            className={cn(
                                                "flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                                                selectedGroup?.id === group.id && "bg-muted"
                                            )}
                                            onClick={() => setSelectedGroup(group)}
                                        >
                                            <div className='flex items-center gap-2'>
                                                <FolderKanban className="h-4 w-4 text-muted-foreground"/>
                                                <div>
                                                    <p className="font-medium">{group.name}</p>
                                                    <p className="text-sm text-muted-foreground">{technicians.filter(t => (t.group || 'Default') === group.name).length} technician(s)</p>
                                                </div>
                                            </div>
                                            {group.name !== 'Default' && (
                                                <div className="flex gap-1">
                                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setEditedGroupName(group.name); }}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                            This will delete the group "{group.name}" and move all its technicians to the "Default" group.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteGroup(group)}>Delete Group</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}
                                        </div>
                                        )
                                    ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Technicians */}
                    <div className="md:col-span-2">
                         <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-xl">Technicians in "{selectedGroup?.name || 'No Group Selected'}"</CardTitle>
                                    <Dialog open={isAddTechDialogOpen} onOpenChange={setIsAddTechDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" disabled={!selectedGroup}>
                                                <UserPlus className="mr-2 h-4 w-4"/> Add Technician
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add New Technician to "{selectedGroup?.name}"</DialogTitle>
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
                                                            <Input id="techName" value={techName} onChange={(e) => setTechName(e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="techEmail">Email</Label>
                                                            <Input id="techEmail" type="email" value={techEmail} onChange={(e) => setTechEmail(e.target.value)} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="techPhone">Phone (Optional)</Label>
                                                            <Input id="techPhone" type="tel" value={techPhone} onChange={(e) => setTechPhone(e.target.value)} />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                                                        <Button onClick={handleAddTechnician}>Add Technician</Button>
                                                    </DialogFooter>
                                                </TabsContent>
                                                <TabsContent value="bulk">
                                                    <div className="space-y-4 py-4">
                                                        <Label htmlFor="bulk-add">Paste a list of "Name, Email, Phone" values, one per line.</Label>
                                                        <Textarea 
                                                            id="bulk-add" 
                                                            value={bulkText}
                                                            onChange={(e) => setBulkText(e.target.value)}
                                                            placeholder="John Doe,john@example.com,123-456-7890"
                                                            rows={5}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Each line should contain the name, email, and optionally a phone number, separated by commas.
                                                        </p>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                                                        <Button onClick={handleBulkAddFromText}>Add Technicians</Button>
                                                    </DialogFooter>
                                                </TabsContent>
                                            </Tabs>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <CardDescription>
                                    {selectedGroup ? `View and manage technicians in the "${selectedGroup.name}" group.` : 'Select a group to see its members.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[28.5rem] rounded-md border">
                                    <div className="p-4 space-y-2">
                                    {!selectedGroup ? (
                                        <p className="text-center text-muted-foreground py-10">Select a group from the list.</p>
                                    ) : filteredTechnicians.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-10">No technicians in this group.</p>
                                    ) : (
                                        filteredTechnicians.map((tech) => (
                                            editingTechnician?.id === tech.id ? (
                                                <div key={tech.id} className="flex flex-col gap-2 rounded-md border p-3 bg-secondary/50">
                                                    <Input value={editedTechName} onChange={e => setEditedTechName(e.target.value)} placeholder="Full Name" />
                                                    <Input type="email" value={editedTechEmail} onChange={e => setEditedTechEmail(e.target.value)} placeholder="Email"/>
                                                    <Input type="tel" value={editedTechPhone} onChange={e => setEditedTechPhone(e.target.value)} placeholder="Phone (Optional)"/>
                                                    <div className="flex justify-end gap-2 mt-1">
                                                        <Button variant="ghost" size="icon" onClick={() => setEditingTechnician(null)}><X className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleUpdateTechnician(tech)}><Check className="h-4 w-4" /></Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div key={tech.id} className="flex items-center justify-between rounded-md border p-3">
                                                    <div>
                                                        <p className="font-medium">{tech.name}</p>
                                                        <p className="text-sm text-muted-foreground">{tech.email}</p>
                                                        {tech.phone && (
                                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <Phone className="h-3 w-3"/> {tech.phone}
                                                            </p>
                                                         )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => showQrCodeDialog(tech.name, tech.email, tech.password || '')}>
                                                            <QrCode className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleResetPassword(tech)}>
                                                            <KeyRound className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => { setEditingTechnician(tech); setEditedTechName(tech.name); setEditedTechEmail(tech.email); setEditedTechPhone(tech.phone || ''); }}>
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
                            </CardContent>
                         </Card>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Dialog */}
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
                    <DialogClose asChild><Button type="button" size="sm">Close</Button></DialogClose>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

    