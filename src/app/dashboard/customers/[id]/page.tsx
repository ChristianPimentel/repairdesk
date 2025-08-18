
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import type { Repair, RepairStatus, Customer } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/context/UserContext';
import { User, Mail, Phone, PlusCircle, Trash2, Pencil, QrCode, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EditCustomerDialog } from '@/components/dashboard/edit-customer-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
  } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import Image from 'next/image';


const getStatusClass = (status: RepairStatus) => {
    switch (status) {
        case 'Pending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800/60';
        case 'In Progress':
            return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800/60';
        case 'Ready':
            return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800/60';
        case 'Archived':
            return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700/60';
        default:
            return '';
    }
};

export default function CustomerDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user, customers, repairs: allRepairs } = useUser();
    const { toast } = useToast();
    const customerId = params.id as string;
    
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [repairs, setRepairs] = useState<Repair[]>([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');


    useEffect(() => {
        const foundCustomer = customers.find(c => c.id === customerId);
        if (foundCustomer) {
            setCustomer(foundCustomer);
            const customerRepairs = allRepairs.filter(r => r.customerId === customerId);
            setRepairs(customerRepairs);
        }
    }, [customerId, customers, allRepairs]);
    
    const handleViewDetails = (repair: Repair) => {
        router.push(`/dashboard/repairs/${repair.id}`);
    }
    
    const handleDeleteCustomer = async () => {
        if (!customer) return;
        try {
            await deleteDoc(doc(db, 'customers', customer.id));
            toast({
                title: 'Customer Deleted',
                description: `${customer.fullName} has been permanently removed.`,
            });
            router.push('/dashboard/customers');
        } catch (error) {
            console.error("Error deleting customer: ", error);
            toast({
                title: 'Error',
                description: 'Could not delete customer.',
                variant: 'destructive',
            });
        }
    };
    
    const showQrCodeDialog = async () => {
        if (!customer || !customer.phone) {
            toast({ title: 'No Phone Number', description: 'This customer does not have a phone number on file.', variant: 'destructive'});
            return;
        };
        const telUri = `tel:${customer.phone}`;
        const qrUrl = await QRCode.toDataURL(telUri);
        setQrCodeUrl(qrUrl);
        setIsQrDialogOpen(true);
    }


    if (!customer) {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The requested customer could not be found.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

  return (
    <>
        <div className="p-4 sm:p-6 lg:p-8">
            <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
                            <ChevronLeft className="mr-2 h-4 w-4"/> Back
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary text-primary-foreground rounded-full h-12 w-12 flex items-center justify-center shrink-0">
                                <User className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">{customer.fullName}</CardTitle>
                                <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mt-1">
                                    <span className='flex items-center gap-2'><Mail className="h-4 w-4"/> {customer.email}</span>
                                    {user?.role === 'Student' ? (
                                        <a href={`tel:${customer.phone}`} className='flex items-center gap-2 text-primary hover:underline'>
                                            <Phone className="h-4 w-4"/> {customer.phone}
                                        </a>
                                    ) : (
                                        <span className='flex items-center gap-2'><Phone className="h-4 w-4"/> {customer.phone}</span>
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 self-start mt-10">
                        <Button variant="outline" size="icon" onClick={showQrCodeDialog}>
                           <QrCode className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => router.push(`/dashboard/new-repair?customerId=${customer.id}`)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> New Repair
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        {user?.role === 'Admin' && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    customer and all associated repair history.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteCustomer}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <h3 className="text-lg font-medium mb-4">Device Repair History</h3>
                <ScrollArea className="h-96">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Device</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {repairs.length > 0 ? (
                            repairs.map((repair) => (
                            <TableRow key={repair.id} onClick={() => handleViewDetails(repair)} className="cursor-pointer">
                                <TableCell>
                                    <div className="font-medium">{repair.brand} {repair.model}</div>
                                    <div className="text-sm text-muted-foreground">{repair.deviceType}</div>
                                </TableCell>
                                <TableCell>{format(repair.createdAt, 'PP')}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn("border", getStatusClass(repair.status))}>
                                        {repair.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No devices found for this customer.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
            </Card>
        </div>

        {customer && (
            <EditCustomerDialog
                customer={customer}
                isOpen={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
        )}
        
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Scan to Call Customer</DialogTitle>
                <DialogDescription>
                    Scanning this code will prompt you to call {customer.fullName}.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-4 gap-4">
                {qrCodeUrl && <Image src={qrCodeUrl} alt="Customer Call QR Code" width={250} height={250} />}
                <div className="text-center">
                    <p className="font-medium">{customer.fullName}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
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
