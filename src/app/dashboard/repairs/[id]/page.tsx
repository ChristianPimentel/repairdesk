
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
    Calendar,
    Wrench,
    User,
    Smartphone,
    Tablet,
    Computer,
    Gamepad,
    AlertCircle,
    KeyRound,
    Package,
    ClipboardList,
    Copy,
    Printer,
    Share2,
    MessageSquare,
    ChevronLeft,
    Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Repair, Technician } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import QRCode from 'qrcode';
import { useUser } from '@/context/UserContext';
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


const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
        case 'Phone': return Smartphone;
        case 'Tablet': return Tablet;
        case 'Computer': return Computer;
        case 'Console': return Gamepad;
        default: return AlertCircle;
    }
}

const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Ready': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'Archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
      default: return '';
    }
};

const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      <path d="M14.05 14.05a2 2 0 0 0-2.83 0L10 15.27l.02.02a12.8 12.8 0 0 0 3.73 3.73l.02.02 1.25-1.25a2 2 0 0 0 0-2.83l-.02-.02z" />
    </svg>
  );

export default function RepairDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const repairId = params.id as string;
    
    const { toast } = useToast();
    const { user, technicians, customers } = useUser();

    const [repair, setRepair] = useState<Repair | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [repairStatusUrl, setRepairStatusUrl] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.share) {
            setShowShare(true);
        }
    }, []);

    useEffect(() => {
        if (!repairId) return;

        const fetchRepair = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'repairs', repairId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const fetchedRepair = {
                        id: docSnap.id,
                        ...data,
                        createdAt: data.createdAt?.toDate(),
                        readyAt: data.readyAt?.toDate(),
                        archivedAt: data.archivedAt?.toDate(),
                    } as Repair;
                    setRepair(fetchedRepair);

                    const statusUrl = `${window.location.origin}/repair-status/${fetchedRepair.id}`;
                    setRepairStatusUrl(statusUrl);
                    QRCode.toDataURL(statusUrl)
                        .then(url => setQrCodeUrl(url))
                        .catch(err => console.error(err));
                    
                    const customer = customers.find(c => c.id === fetchedRepair.customerId);
                    if(customer?.phone) {
                        setCustomerPhone(customer.phone);
                    } else {
                        setCustomerPhone('');
                    }

                } else {
                    setError('Repair not found.');
                }
            } catch (err) {
                console.error("Error fetching repair:", err);
                setError('Failed to fetch repair details.');
            } finally {
                setLoading(false);
            }
        };

        fetchRepair();
    }, [repairId, customers]);

    if (loading) {
        return <div className="p-8">Loading repair details...</div>;
    }

    if (error) {
        return <div className="p-8 text-destructive">{error}</div>;
    }

    if (!repair) return null;

    const DeviceIcon = getDeviceIcon(repair.deviceType);

    const getTechnicianName = (techIdentifier: string): string => {
        if (!technicians || !techIdentifier) return 'Unassigned';
        
        const identifier = techIdentifier.toLowerCase();
        
        const technicianByEmail = technicians.find(t => t.email.toLowerCase() === identifier);
        if (technicianByEmail) return technicianByEmail.name;
    
        const technicianByName = technicians.find(t => t.name.toLowerCase() === identifier);
        if (technicianByName) return technicianByName.name;
    
        return techIdentifier;
    };
    
    const handleCloneRepair = async () => {
        try {
            const { id, createdAt, readyAt, archivedAt, ...clonedData } = repair;
            
            const docRef = await addDoc(collection(db, 'repairs'), {
                ...clonedData,
                status: 'Pending',
                createdAt: serverTimestamp(),
                readyAt: null,
                archivedAt: null,
            });

            toast({
                title: 'Repair Cloned',
                description: `A new repair for ${repair.customerName} has been created.`,
            });
            
            router.push(`/dashboard/repairs/${docRef.id}`);
        } catch (error) {
            console.error("Error cloning repair: ", error);
            toast({
                title: 'Error',
                description: 'Could not clone repair.',
                variant: 'destructive',
            });
        }
    }
    
    const handleDeleteRepair = async () => {
        if (!repair) return;
        try {
            await deleteDoc(doc(db, 'repairs', repair.id));
            toast({
                title: 'Repair Deleted',
                description: `Repair #${repair.id.slice(-6).toUpperCase()} has been permanently removed.`,
            });
            router.push('/dashboard/archive');
        } catch (error) {
            console.error("Error deleting repair: ", error);
            toast({
                title: 'Error',
                description: 'Could not delete repair.',
                variant: 'destructive',
            });
        }
    };
    
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`
            <html>
                <head><title>Repair Ticket QR Code</title></head>
                <body style="text-align: center; font-family: sans-serif;">
                    <h2>Repair ID: ${repair.id.slice(-6).toUpperCase()}</h2>
                    <p>Scan to see your repair status.</p>
                    <img src="${qrCodeUrl}" alt="Repair QR Code" />
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow?.document.close();
    }
    
    const handleShare = async (method: 'whatsapp' | 'sms' | 'native') => {
        const shareText = `Track the status of your repair (ID: ${repair.id.slice(-6).toUpperCase()}) here: ${repairStatusUrl}`;
        const phoneNumber = customerPhone.replace(/\\D/g, '');

        if (method === 'whatsapp') {
            if (phoneNumber) {
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(shareText)}`;
                window.open(whatsappUrl, '_blank');
            } else {
                toast({ title: 'No Phone Number', description: 'This customer does not have a phone number on file.', variant: 'destructive'});
            }
        } else if (method === 'sms') {
            if (phoneNumber) {
                const smsUrl = `sms:${phoneNumber}?&body=${encodeURIComponent(shareText)}`;
                window.location.href = smsUrl;
            } else {
                toast({ title: 'No Phone Number', description: 'This customer does not have a phone number on file.', variant: 'destructive'});
            }
        } else if (method === 'native') {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Repair Status',
                        text: shareText,
                        url: repairStatusUrl,
                    });
                } catch (error) {
                    console.error('Error sharing:', error);
                }
            } else {
                navigator.clipboard.writeText(shareText);
                toast({ title: 'Link Copied', description: 'The repair status link has been copied to your clipboard.' });
            }
        }
    }
  
    return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <div className="flex items-start justify-between">
                <div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
                        <ChevronLeft className="mr-2 h-4 w-4"/> Back
                    </Button>
                    <CardTitle>
                        Repair Details - #{repair.id.slice(-6).toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                        Viewing details for the repair of a {repair.brand} {repair.model}.
                    </CardDescription>
                </div>
                {repair.status === 'Archived' && (
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleCloneRepair}>
                            <Copy className='mr-2 h-4 w-4' />
                            Clone Repair
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
                                        This action cannot be undone. This will permanently delete the repair record for #{repair.id.slice(-6).toUpperCase()}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteRepair}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                )}
            </div>
        </CardHeader>
        
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><User className="h-4 w-4"/>Customer Information</h3>
                        <div className="text-sm text-muted-foreground">
                            <p>{repair.customerName}</p>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><DeviceIcon className="h-4 w-4"/>Device Information</h3>
                        <div className="text-sm text-muted-foreground">
                            <p>{repair.brand} {repair.model}</p>
                            {repair.passwordPin && (
                                <p className="flex items-center gap-1"><KeyRound className="h-3 w-3"/> PIN: {repair.passwordPin}</p>
                            )}
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4"/>Accessories</h3>
                        <div className="text-sm text-muted-foreground">
                            {repair.accessories.length > 0 ? (
                            <ul className="list-disc list-inside">
                                {repair.accessories.map(acc => <li key={acc}>{acc}</li>)}
                            </ul>
                            ) : 'No accessories checked in.'}
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4"/>Problem Notes</h3>
                        <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{repair.problemNotes}</p>
                    </div>

                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Wrench className="h-4 w-4"/>Repair Status</h3>
                        <div className="flex items-center gap-2">
                            <Badge className={cn("border-transparent", getStatusClass(repair.status))}>{repair.status}</Badge>
                            <span className="text-sm text-muted-foreground">Serviced by {getTechnicianName(repair.assignedToName)}</span>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Calendar className="h-4 w-4"/>Timeline</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li><strong>Created:</strong> {format(repair.createdAt, 'PPp')}</li>
                            {repair.readyAt && <li><strong>Ready:</strong> {format(repair.readyAt, 'PPp')}</li>}
                            {repair.archivedAt && <li><strong>Archived:</strong> {format(repair.archivedAt, 'PPp')}</li>}
                        </ul>
                    </div>
                    
                    {repair.status !== 'Archived' && (
                        <>
                        <Separator />
                        <div>
                            <h3 className="font-semibold mb-2">Customer Status QR Code</h3>
                            {qrCodeUrl ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="border rounded-md p-2 bg-white">
                                    <Image src={qrCodeUrl} alt="Repair Status QR Code" width={150} height={150} />
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {customerPhone && (
                                            <>
                                            <Button type="button" size="sm" variant="outline" onClick={() => handleShare('whatsapp')}>
                                                <WhatsAppIcon /> WhatsApp
                                            </Button>
                                            <Button type="button" size="sm" variant="outline" onClick={() => handleShare('sms')}>
                                                <MessageSquare /> SMS
                                            </Button>
                                            </>
                                        )}
                                        {showShare && (
                                            <Button type="button" size="sm" variant="outline" onClick={() => handleShare('native')}>
                                                <Share2 /> Other
                                            </Button>
                                        )}
                                        <Button type="button" size="sm" variant="outline" onClick={handlePrint}>
                                            <Printer /> Print
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                            )}
                        </div>
                        </>
                    )}

                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

  
