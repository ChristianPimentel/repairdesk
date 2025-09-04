

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
import { Pencil, Trash2, Check, X, FolderKanban, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '@/context/UserContext';
import type { Group } from '@/lib/types';
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


export default function GroupsPage() {
    const { user, groups, technicians } = useUser();
    const [name, setName] = useState('');
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editedName, setEditedName] = useState('');

    const { toast } = useToast();

    const handleAddGroup = async () => {
        if (!name) {
            toast({ title: 'Missing Information', description: 'Please provide a group name.', variant: 'destructive' });
            return;
        }
        if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
            toast({ title: 'Group exists', description: 'A group with this name already exists.', variant: 'destructive' });
            return;
        }

        const newGroup = {
            name,
        };

        try {
            await addDoc(collection(db, 'groups'), newGroup);
            toast({ title: 'Group Created', description: `The group "${name}" has been created.` });
            setName('');
        } catch (error) {
            console.error("Error adding group: ", error);
            toast({ title: 'Error', description: 'Could not add group.', variant: 'destructive' });
        }
    };

    const handleDeleteGroup = async (group: Group) => {
        try {
            const batch = writeBatch(db);

            // Find all technicians in this group and update them
            const techsInGroupQuery = query(collection(db, 'technicians'), where('group', '==', group.name));
            const techSnapshot = await getDocs(techsInGroupQuery);
            techSnapshot.forEach(doc => {
                batch.update(doc.ref, { group: 'Default' });
            });

            // Delete the group itself
            const groupRef = doc(db, 'groups', group.id);
            batch.delete(groupRef);

            await batch.commit();

            toast({ title: 'Group Deleted', description: `The group "${group.name}" has been removed.`, variant: 'destructive' });
        } catch (error) {
            console.error("Error deleting group: ", error);
            toast({ title: 'Error', description: 'Could not remove group.', variant: 'destructive' });
        }
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
        setEditedName(group.name);
    };

    const handleCancelEdit = () => {
        setEditingGroup(null);
        setEditedName('');
    };

    const handleUpdateGroup = async () => {
        if (!editingGroup || !editedName) return;

        if (editedName.toLowerCase() !== editingGroup.name.toLowerCase() && groups.some(a => a.name.toLowerCase() === editedName.toLowerCase())) {
            toast({ title: 'Group exists', description: 'A group with this name already exists.', variant: 'destructive' });
            return;
        }

        try {
            const batch = writeBatch(db);

            // Find all technicians in this group and update them
            const techsInGroupQuery = query(collection(db, 'technicians'), where('group', '==', editingGroup.name));
            const techSnapshot = await getDocs(techsInGroupQuery);
            techSnapshot.forEach(doc => {
                batch.update(doc.ref, { group: editedName });
            });

            // Update the group name itself
            const groupRef = doc(db, 'groups', editingGroup.id);
            batch.update(groupRef, { name: editedName });

            await batch.commit();

            toast({ title: 'Group Updated', description: `The group name has been updated.` });
            handleCancelEdit();
        } catch (error) {
            console.error("Error updating group: ", error);
            toast({ title: 'Error', description: 'Could not update group.', variant: 'destructive' });
        }
    };
    
    const getTechnicianCount = (groupName: string) => {
        return technicians.filter(t => (t.group || 'Default') === groupName).length;
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
                    <CardTitle>Manage Technician Groups</CardTitle>
                    <CardDescription>
                        Create, edit, or remove technician groups.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        
                        <div className="space-y-2 p-4 border rounded-lg">
                            <h3 className="font-medium text-lg">Add New Group</h3>
                            <div className="flex gap-2">
                                <Input 
                                    id="groupName" 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="e.g., Hardware Team"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                                />
                                <Button onClick={handleAddGroup}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Group
                                </Button>
                            </div>
                        </div>


                        <div className="space-y-2">
                            <h3 className="font-medium text-lg">Group List</h3>
                            <ScrollArea className="h-96 rounded-md border">
                                <div className="p-4 space-y-2">
                                {groups.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No groups created yet.</p>
                                ) : (
                                    groups.map((group) => (
                                        editingGroup?.id === group.id ? (
                                            <div key={group.id} className="flex items-center gap-2 rounded-md border p-3 bg-secondary/50">
                                                <FolderKanban className="h-4 w-4 text-muted-foreground"/>
                                                <Input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Group Name"/>
                                                <Button variant="ghost" size="icon" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={handleUpdateGroup}><Check className="h-4 w-4" /></Button>
                                            </div>
                                        ) : (
                                            <div key={group.id} className="flex items-center justify-between rounded-md border p-3">
                                                <div className='flex items-center gap-2'>
                                                    <FolderKanban className="h-4 w-4 text-muted-foreground"/>
                                                    <div>
                                                        <p className="font-medium">{group.name}</p>
                                                        <p className="text-sm text-muted-foreground">{getTechnicianCount(group.name)} technician(s)</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditGroup(group)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                            This action cannot be undone. This will delete the group "{group.name}" and move all its technicians to the "Default" group.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteGroup(group)}>Delete Group</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        )
                                    ))
                                )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
