
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
import { Pencil, Trash2, Check, X, FolderKanban, PlusCircle, UserPlus, KeyRound, QrCode, ClipboardPaste, Phone, Upload, Users } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
    const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
    const [editedTechName, setEditedTechName] = useState('');
    const [editedTechEmail, setEditedTechEmail] = useState('');
    const [editedTechPhone, setEditedTechPhone] = useState('');
    const [editedTechGroup, setEditedTechGroup] = useState('');
    const [isAddTechDialogOpen, setIsAddTechDialogOpen] = useState(false);

    // Bulk Actions State
    const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
    const [isChangeGroupOpen, setIsChangeGroupOpen] = useState(false);
    const [targetGroupId, setTargetGroupId] = useState('');


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
    
    const allGroups = useMemo(() => [{id: 'default', name: 'Default'}, ...groups], [groups]);

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
            setSelectedGroup(allGroups.find(g => g.name === 'Default') || null);
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

    const processBulkAdd = async (data: any[][]) => {
        const addedTechnicians: {name: string, email: string, pass: string}[] = [];
        const duplicates: string[] = [];
        const existingEmails = new Set(technicians.map(t => t.email.toLowerCase()));

        for (const row of data) {
            const name = row[0];
            const email = row[1];
            const phone = row[2] || '';

            if (name && email && typeof email === 'string') {
                if (!existingEmails.has(email.toLowerCase())) {
                    const tempPassword = generatePassword();
                    const newTechnician = {
                        name,
                        email: email.toLowerCase(),
                        phone: String(phone),
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
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            if (data) {
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                processBulkAdd(json.slice(1)); // Assuming first row is header
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; // Reset file input
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
            await updateDoc(techRef, { 
                name: editedTechName, 
                email: editedTechEmail.toLowerCase(), 
                phone: editedTechPhone,
                group: editedTechGroup
            });
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

    // Bulk Action Handlers
    const handleToggleSelectAll = () => {
        if (selectedTechnicians.length === filteredTechnicians.length) {
            setSelectedTechnicians([]);
        } else {
            setSelectedTechnicians(filteredTechnicians.map(t => t.id));
        }
    };

    const handleToggleSelectTechnician = (techId: string) => {
        setSelectedTechnicians(prev => 
            prev.includes(techId)
                ? prev.filter(id => id !== techId)
                : [...prev, techId]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedTechnicians.length === 0) return;
        const batch = writeBatch(db);
        selectedTechnicians.forEach(id => {
            batch.delete(doc(db, 'technicians', id));
        });
        try {
            await batch.commit();
            toast({ title: 'Success', description: `${selectedTechnicians.length} technician(s) deleted.` });
            setSelectedTechnicians([]);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not delete technicians.', variant: 'destructive' });
        }
    };

    const handleBulkResetPasswords = async () => {
        if (selectedTechnicians.length === 0) return;
        const batch = writeBatch(db);
        selectedTechnicians.forEach(id => {
            const newPassword = generatePassword();
            batch.update(doc(db, 'technicians', id), {
                password: newPassword,
                forcePasswordChange: true
            });
        });
        try {
            await batch.commit();
            toast({ title: 'Success', description: `Passwords for ${selectedTechnicians.length} technician(s) have been reset.` });
            setSelectedTechnicians([]);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not reset passwords.', variant: 'destructive' });
        }
    };

    const handleBulkChangeGroup = async () => {
        if (selectedTechnicians.length === 0 || !targetGroupId) return;
        const targetGroup = allGroups.find(g => g.id === targetGroupId);
        if (!targetGroup) return;

        const batch = writeBatch(db);
        selectedTechnicians.forEach(id => {
            batch.update(doc(db, 'technicians', id), { group: targetGroup.name });
        });
        try {
            await batch.commit();
            toast({ title: 'Success', description: `${selectedTechnicians.length} technician(s) moved to ${targetGroup.name}.` });
            setSelectedTechnicians([]);
            setIsChangeGroupOpen(false);
            setTargetGroupId('');
        } catch (error) {
            toast({ title: 'Error', description: 'Could not change group for technicians.', variant: 'destructive' });
        }
    };


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
                                            onClick={() => {setSelectedGroup(group); setSelectedTechnicians([]);}}
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
                                                    <TabsTrigger value="bulk"><Upload className="mr-2 h-4 w-4" /> Bulk Add</TabsTrigger>
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
                                                    <div className="space-y-4 py-4 text-center">
                                                        <Label htmlFor="file-upload" className="cursor-pointer">
                                                            <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 hover:bg-muted/50">
                                                                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                                                <p className="mt-2 text-sm text-muted-foreground">Click to upload an .xlsx file</p>
                                                                <p className="text-xs text-muted-foreground">Columns: Name, Email, Phone</p>
                                                            </div>
                                                        </Label>
                                                        <Input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                                                    </div>
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
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 border-b">
                                        <Checkbox 
                                            id="select-all-techs"
                                            checked={selectedTechnicians.length > 0 && selectedTechnicians.length === filteredTechnicians.length}
                                            onCheckedChange={handleToggleSelectAll}
                                            disabled={filteredTechnicians.length === 0}
                                        />
                                        <Label htmlFor="select-all-techs" className="font-semibold text-sm w-full cursor-pointer">
                                            {selectedTechnicians.length > 0 ? `${selectedTechnicians.length} selected` : 'Select All'}
                                        </Label>
                                    </div>
                                    <ScrollArea className="h-[24rem] rounded-md">
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
                                                        <Select value={editedTechGroup} onValueChange={setEditedTechGroup}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a group" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {allGroups.map(g => (
                                                                    <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex justify-end gap-2 mt-1">
                                                            <Button variant="ghost" size="icon" onClick={() => setEditingTechnician(null)}><X className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleUpdateTechnician(tech)}><Check className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={tech.id} className="flex items-center justify-between rounded-md border p-3 pr-1">
                                                        <div className='flex items-center gap-3 w-full' onClick={() => handleToggleSelectTechnician(tech.id)}>
                                                            <Checkbox 
                                                                checked={selectedTechnicians.includes(tech.id)}
                                                                id={`select-tech-${tech.id}`}
                                                            />
                                                            <div>
                                                                <p className="font-medium">{tech.name}</p>
                                                                <p className="text-sm text-muted-foreground">{tech.email}</p>
                                                                {tech.phone && (
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                                        <Phone className="h-3 w-3"/> {tech.phone}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); showQrCodeDialog(tech.name, tech.email, tech.password || '')}}>
                                                                <QrCode className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleResetPassword(tech)}}>
                                                                <KeyRound className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingTechnician(tech); setEditedTechName(tech.name); setEditedTechEmail(tech.email); setEditedTechPhone(tech.phone || ''); setEditedTechGroup(tech.group || 'Default'); }}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => {e.stopPropagation(); handleDeleteTechnician(tech.id)}}>
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
                                {selectedTechnicians.length > 0 && (
                                    <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between gap-2 flex-wrap">
                                        <p className="text-sm font-medium">{selectedTechnicians.length} technician(s) selected.</p>
                                        <div className="flex gap-2 flex-wrap">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the selected {selectedTechnicians.length} technician(s).</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="outline" size="sm"><KeyRound className="mr-2 h-4 w-4" /> Reset Passwords</Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will reset the passwords for the selected {selectedTechnicians.length} technician(s) and require them to set a new one on next login.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkResetPasswords}>Reset Passwords</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                             <Dialog open={isChangeGroupOpen} onOpenChange={setIsChangeGroupOpen}>
                                                <DialogTrigger asChild><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> Change Group</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Change Group</DialogTitle><DialogDescription>Move {selectedTechnicians.length} technician(s) to a new group.</DialogDescription></DialogHeader>
                                                    <div className="py-4 space-y-2">
                                                        <Label htmlFor="group-select">New Group</Label>
                                                        <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                                                            <SelectTrigger id="group-select"><SelectValue placeholder="Select a group" /></SelectTrigger>
                                                            <SelectContent>
                                                                {allGroups.map(g => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button onClick={handleBulkChangeGroup}>Move Technicians</Button></DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                )}
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
