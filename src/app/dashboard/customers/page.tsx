
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
import { useRouter } from 'next/navigation';
import type { Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, UserPlus, ClipboardPaste, Trash2, QrCode } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
  } from '@/components/ui/dialog';
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
import { useUser } from '@/context/UserContext';
import { addDoc, collection, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import QRCode from 'qrcode';
import Image from 'next/image';

export default function CustomersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const { user, customers } = useUser();
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentCustomerInfo, setCurrentCustomerInfo] = useState<{name: string, email: string, phone: string} | null>(null);


  const { toast } = useToast();

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setSelectedCustomers([]); // Clear selection on new search
  };

  const filteredCustomers = useMemo(() => (customers || []).filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  ), [customers, searchTerm]);

  const handleAddCustomer = async () => {
    if (!custName || (!custEmail && !custPhone)) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name and at least an email or phone number.',
        variant: 'destructive',
      });
      return;
    }

    try {
        await addDoc(collection(db, 'customers'), {
            fullName: custName,
            email: custEmail,
            phone: custPhone,
            createdAt: serverTimestamp(),
        });
        
        toast({
          title: 'Customer Added',
          description: `${custName} has been added.`,
        });

        setCustName('');
        setCustPhone('');
        setCustEmail('');

    } catch (error) {
        console.error("Error adding customer: ", error);
        toast({
            title: 'Error',
            description: 'Could not add customer.',
            variant: 'destructive'
        });
    }
  };
  
  const handleBulkAddFromText = async () => {
    if (!bulkText.trim()) {
        toast({
            title: 'No Input',
            description: 'Please paste customer data into the text area.',
            variant: 'destructive',
        });
        return;
    }
    
    let addedCount = 0;
    const duplicates: string[] = [];
    const existingEmails = new Set(customers.map(c => c.email.toLowerCase()));
    
    const lines = bulkText.trim().split('\n');

    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) { // Require at least name and email
            const name = parts[0];
            const email = parts[1];
            const phone = parts[2] || ''; // Phone is optional
            
            if (name && email) {
                if (!existingEmails.has(email.toLowerCase())) {
                    try {
                        await addDoc(collection(db, 'customers'), {
                            fullName: name,
                            email,
                            phone,
                            createdAt: serverTimestamp(),
                        });
                        addedCount++;
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

    if (addedCount > 0) {
        toast({
            title: `Bulk Add Successful`,
            description: `${addedCount} customers have been added.`,
        });
    }

    if (duplicates.length > 0) {
        toast({
            title: 'Some Duplicates Skipped',
            description: `${duplicates.length} customers were not added because their email already exists.`,
            variant: 'destructive',
        });
    }
    
    setBulkText('');
  };
  
  const handleToggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
        setSelectedCustomers([]);
    } else {
        setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
        prev.includes(customerId)
            ? prev.filter(id => id !== customerId)
            : [...prev, customerId]
    );
  };
  
  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) return;

    try {
        const batch = writeBatch(db);
        selectedCustomers.forEach(id => {
            const docRef = doc(db, 'customers', id);
            batch.delete(docRef);
        });
        await batch.commit();

        toast({
            title: 'Customers Deleted',
            description: `${selectedCustomers.length} customer(s) have been permanently removed.`
        });
        setSelectedCustomers([]);
    } catch (error) {
        console.error("Error deleting customers: ", error);
        toast({
            title: 'Error',
            description: 'Could not delete customers.',
            variant: 'destructive',
        });
    }
  }

  const showQrCodeDialog = async (customer: Customer) => {
    if (!customer.phone) {
        toast({ title: 'No Phone Number', description: 'This customer does not have a phone number on file.', variant: 'destructive'});
        return;
    };
    const telUri = `tel:${customer.phone}`;
    const qrUrl = await QRCode.toDataURL(telUri);
    setQrCodeUrl(qrUrl);
    setCurrentCustomerInfo({ name: customer.fullName, email: customer.email, phone: customer.phone });
    setIsQrDialogOpen(true);
  }


  return (
    <>
        <div className="p-4 sm:p-6 lg:p-8">
            <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>Customers</CardTitle>
                    <CardDescription>
                        Search for or add new customers.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <Tabs defaultValue="search">
                    <TabsList className={`grid w-full ${user?.role === 'Admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <TabsTrigger value="search">Search Customers</TabsTrigger>
                      <TabsTrigger value="single"><UserPlus className="mr-2 h-4 w-4" /> Add Single</TabsTrigger>
                      {user?.role === 'Admin' && (
                        <TabsTrigger value="bulk"><ClipboardPaste className="mr-2 h-4 w-4" /> Bulk Add</TabsTrigger>
                      )}
                  </TabsList>
                  <TabsContent value="search" className="mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerSearch">Search by Name/Email/Phone</Label>
                        <div className="flex gap-2">
                            <Input
                            id="customerSearch"
                            placeholder="Type to search…"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                      </div>
                      <ScrollArea className="h-96 rounded-md border mt-4">
                        <div className="p-1">
                            <div className="flex items-center gap-2 p-2 border-b">
                                <Checkbox 
                                    id="select-all"
                                    checked={selectedCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length}
                                    onCheckedChange={handleToggleSelectAll}
                                    disabled={filteredCustomers.length === 0}
                                />
                                <Label htmlFor="select-all" className="font-semibold text-sm w-full cursor-pointer">
                                    {selectedCustomers.length > 0 ? `${selectedCustomers.length} selected` : 'Select All'}
                                </Label>
                            </div>
                            {filteredCustomers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No customers found.</p>
                            ) : (
                            <div className="space-y-1">
                                {filteredCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="flex items-center justify-between rounded-md p-2 pr-1 cursor-pointer transition-colors hover:bg-muted/50"
                                >
                                    <div className='flex items-center gap-3 w-full' onClick={() => handleToggleSelectCustomer(customer.id)}>
                                        <Checkbox 
                                            checked={selectedCustomers.includes(customer.id)}
                                            id={`select-${customer.id}`}
                                        />
                                        <div onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/customers/${customer.id}`)}} className="w-full hover:underline">
                                            <p className="font-medium">{customer.fullName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {customer.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); showQrCodeDialog(customer)}}>
                                        <QrCode className="h-4 w-4" />
                                    </Button>
                                </div>
                                ))}
                            </div>
                            )}
                        </div>
                      </ScrollArea>
                      {user?.role === 'Admin' && selectedCustomers.length > 0 && (
                          <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
                            <p className="text-sm font-medium">{selectedCustomers.length} customer(s) selected.</p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Selected
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the
                                            <span className='font-bold'> {selectedCustomers.length} </span> selected customer(s).
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                      )}
                  </TabsContent>
                  <TabsContent value="single">
                    <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-medium text-lg">Add New Customer</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                <Label htmlFor="custName">Full Name</Label>
                                <Input id="custName" value={custName} onChange={(e) => setCustName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="custPhone">Phone</Label>
                                <Input id="custPhone" type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="custEmail">Email</Label>
                                <Input id="custEmail" type="email" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
                            </div>
                        </div>
                        <Button onClick={handleAddCustomer} className="w-full">Add Customer</Button>
                    </div>
                  </TabsContent>
                  {user?.role === 'Admin' && (
                    <TabsContent value="bulk">
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="font-medium text-lg">Paste Customer List</h3>
                            <div className="space-y-2">
                                <Label htmlFor="bulk-add">Paste a list of "Name, Email, Phone" values, one per line.</Label>
                                <Textarea 
                                    id="bulk-add" 
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="John Doe,john@example.com,123-456-7890\nJane Smith,jane@example.com,987-654-3210"
                                    rows={5}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Each line should contain the name, email, and optionally a phone number, separated by commas.
                                </p>
                            </div>
                            <Button onClick={handleBulkAddFromText} className="w-full">Add Customers</Button>
                        </div>
                    </TabsContent>
                  )}
                </Tabs>
            </CardContent>
            </Card>
        </div>
        
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Scan to Call Customer</DialogTitle>
                <DialogDescription>
                    Scanning this code will prompt you to call {currentCustomerInfo?.name}.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 gap-4">
                {qrCodeUrl && <Image src={qrCodeUrl} alt="Customer Call QR Code" width={250} height={250} />}
                {currentCustomerInfo && (
                    <div className="text-center">
                        <p className="font-medium">{currentCustomerInfo.name}</p>
                        <p className="text-sm text-muted-foreground">{currentCustomerInfo.email}</p>
                        <p className="text-sm text-muted-foreground">{currentCustomerInfo.phone}</p>
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
    </>
  );
}
