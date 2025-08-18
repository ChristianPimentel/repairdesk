
'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Computer,
  Smartphone,
  Tablet,
  Gamepad,
  AlertCircle,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Combobox } from '@/components/ui/combobox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const deviceTypes = [
  { value: 'Computer', icon: Computer },
  { value: 'Phone', icon: Smartphone },
  { value: 'Tablet', icon: Tablet },
  { value: 'Console', icon: Gamepad },
  { value: 'Other', icon: AlertCircle },
];

function DonationsContent() {
    const { user, customers, donations } = useUser();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [deviceType, setDeviceType] = useState('');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        if (searchParams.get('customerId')) {
            setSelectedCustomerId(searchParams.get('customerId')!);
        }
        if (searchParams.get('deviceType')) {
            setDeviceType(searchParams.get('deviceType')!);
        }
        if (searchParams.get('brand')) {
            setBrand(searchParams.get('brand')!);
        }
        if (searchParams.get('model')) {
            setModel(searchParams.get('model')!);
        }
    }, [searchParams]);

    const resetForm = () => {
        setSelectedCustomerId('');
        setDeviceType('');
        setBrand('');
        setModel('');
        setNotes('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('customerId');
        params.delete('deviceType');
        params.delete('brand');
        params.delete('model');
        router.replace(`/dashboard/donations?${params.toString()}`);
    }

    const handleAddDonation = async () => {
        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
        if (!selectedCustomer) {
            toast({
                title: 'No Customer Selected',
                description: 'Please search for and select the donating customer first.',
                variant: 'destructive',
            });
            return;
        }

        if (!deviceType || !brand || !model) {
            toast({
                title: 'Missing Information',
                description: 'Please fill out all device details.',
                variant: 'destructive',
            });
            return;
        }

        try {
            await addDoc(collection(db, 'donations'), {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.fullName,
                deviceType,
                brand,
                model,
                notes,
                donatedAt: serverTimestamp(),
                receivedBy: user?.email,
            });
            
            toast({
              title: 'Donation Recorded',
              description: `Donation from ${selectedCustomer.fullName} has been recorded.`,
            });
    
            resetForm();
    
        } catch (error) {
            console.error("Error adding donation: ", error);
            toast({
                title: 'Error',
                description: 'Could not record the donation.',
                variant: 'destructive'
            });
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
    
    const customerOptions = (customers || []).map(c => ({ value: c.id, label: `${c.fullName} (${c.email})`}));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
             <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Record a Donation</CardTitle>
                    <CardDescription>
                        Use this form to log a device donation from a customer.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="customerSearch">Select Donating Customer</Label>
                        <Combobox 
                            options={customerOptions}
                            value={selectedCustomerId}
                            onChange={setSelectedCustomerId}
                            placeholder="Select a customer"
                            searchPlaceholder="Search customers..."
                            noResultsText="No customer found."
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="deviceType">Device Type</Label>
                            <Select value={deviceType} onValueChange={setDeviceType}>
                            <SelectTrigger id="deviceType">
                                <SelectValue placeholder="Select device type" />
                            </SelectTrigger>
                            <SelectContent>
                                {deviceTypes.map(d => (
                                <SelectItem key={d.value} value={d.value}>
                                    <div className="flex items-center gap-2">
                                    <d.icon className="h-4 w-4 text-muted-foreground" />
                                    <span>{d.value}</span>
                                    </div>
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Input id="brand" placeholder="e.g., Apple, Samsung" value={brand} onChange={e => setBrand(e.target.value)} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input id="model" placeholder="e.g., iPhone 14, XPS 15" value={model} onChange={e => setModel(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">Notes on Condition</Label>
                        <Textarea
                            id="notes"
                            placeholder="Describe the condition of the device, any known issues, etc."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAddDonation} className="w-full">Record Donation</Button>
                </CardFooter>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Donation History</CardTitle>
                    <CardDescription>A list of all recorded donations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Device</TableHead>
                                    <TableHead className="hidden sm:table-cell">Notes</TableHead>
                                    <TableHead className="text-right">Donated On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {donations.length > 0 ? (
                                    donations.map((donation) => (
                                        <TableRow key={donation.id}>
                                            <TableCell>{donation.customerName}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{donation.brand} {donation.model}</div>
                                                <div className="text-sm text-muted-foreground">{donation.deviceType}</div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell max-w-sm truncate">{donation.notes || 'N/A'}</TableCell>
                                            <TableCell className="text-right">{donation.donatedAt ? format(donation.donatedAt, 'PP') : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No donations recorded yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}

export default function DonationsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DonationsContent />
        </Suspense>
    )
}
