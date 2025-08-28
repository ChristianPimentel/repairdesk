
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RepairCard } from '@/components/dashboard/repair-card';
import type { Repair } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditRepairPage() {
    const { user, technicians, customers } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const repairId = params.id as string;

    const [repair, setRepair] = useState<Repair | null>(null);
    const [loading, setLoading] = useState(true);

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
                }
            } catch (err) {
                console.error("Error fetching repair:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRepair();
    }, [repairId]);

    const handleUpdateRepair = async (updatedRepairData: Omit<Repair, 'id' | 'createdAt' | 'readyAt' | 'archivedAt'>) => {
        if (!repair) return;

        try {
            const repairRef = doc(db, 'repairs', repair.id);
            await updateDoc(repairRef, {
                ...updatedRepairData,
            });
            
            toast({
                title: 'Repair Ticket Updated',
                description: `The repair for ${updatedRepairData.customerName} has been updated.`,
            });
            router.push(`/dashboard/repairs/${repair.id}`);
        } catch (error) {
            console.error("Error updating repair ticket: ", error);
            toast({
                title: 'Error',
                description: 'Could not update repair ticket.',
                variant: 'destructive',
            });
        }
    };
    
    if (loading) {
        return (
             <div className="p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading Repair...</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Please wait while we fetch the repair details.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!repair) {
        return (
             <div className="p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Repair Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The repair you are trying to edit could not be found.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <RepairCard
                technicians={technicians}
                customers={customers}
                existingRepair={repair}
                onCreateRepair={handleUpdateRepair} // We reuse the same prop for simplicity
            />
        </div>
    )
}
