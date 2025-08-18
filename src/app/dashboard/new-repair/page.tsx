
'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { RepairCard } from '@/components/dashboard/repair-card';
import type { Repair, Customer } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Share2, MessageSquare, Printer } from 'lucide-react';

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

function NewRepairContent() {
    const { technicians, customers } = useUser();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const customerId = searchParams.get('customerId');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [repairStatusUrl, setRepairStatusUrl] = useState('');
    const [newRepairId, setNewRepairId] = useState('');
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    
    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.share) {
            setShowShare(true);
        }
    }, []);


    const handleCreateRepair = async (newRepairData: Omit<Repair, 'id' | 'createdAt' | 'readyAt' | 'archivedAt'>) => {
        try {
            const customer = customers.find(c => c.id === newRepairData.customerId);
            if(customer?.phone) {
                setCustomerPhone(customer.phone);
            } else {
                setCustomerPhone('');
            }

            const docRef = await addDoc(collection(db, 'repairs'), {
                ...newRepairData,
                createdAt: serverTimestamp(),
                readyAt: null,
                archivedAt: null,
            });
            
            const statusUrl = `${window.location.origin}/repair-status/${docRef.id}`;
            const qrUrl = await QRCode.toDataURL(statusUrl);

            setRepairStatusUrl(statusUrl);
            setQrCodeUrl(qrUrl);
            setNewRepairId(docRef.id);
            setIsQrDialogOpen(true);
            
            toast({
                title: 'Repair Ticket Created',
                description: `A new repair for ${newRepairData.customerName} has been created.`,
            });
        } catch (error) {
            console.error("Error creating repair ticket: ", error);
            toast({
                title: 'Error',
                description: 'Could not create repair ticket.',
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
                    <h2>Repair ID: ${newRepairId}</h2>
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
        const shareText = `Track the status of your repair (ID: ${newRepairId.slice(-6).toUpperCase()}) here: ${repairStatusUrl}`;
        const phoneNumber = customerPhone.replace(/\D/g, '');

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
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                <RepairCard
                    onCreateRepair={handleCreateRepair}
                    technicians={technicians}
                    customers={customers}
                    preselectedCustomerId={customerId}
                />
            </div>
            <Dialog open={isQrDialogOpen} onOpenChange={(isOpen) => {
                setIsQrDialogOpen(isOpen);
                if (!isOpen) {
                    setCustomerPhone('');
                }
            }}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Repair Ticket Created!</DialogTitle>
                    <DialogDescription>
                        Scan, share, or print this QR code for the customer to track their repair status.
                        Repair ID: {newRepairId.slice(-6).toUpperCase()}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center items-center p-4">
                    {qrCodeUrl && <Image src={qrCodeUrl} alt="Repair QR Code" width={250} height={250} />}
                </div>
                <DialogFooter className="flex-wrap justify-center sm:justify-end gap-2">
                    {customerPhone && (
                        <>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleShare('whatsapp')}>
                           <WhatsAppIcon /> WhatsApp
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleShare('sms')}>
                            <MessageSquare /> SMS
                        </Button>
                        </>
                    )}
                    {showShare && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleShare('native')}>
                            <Share2 /> Other Apps
                        </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <DialogClose asChild>
                        <Button type="button" size="sm">Close</Button>
                    </DialogClose>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}


export default function NewRepairPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewRepairContent />
        </Suspense>
    )
}
