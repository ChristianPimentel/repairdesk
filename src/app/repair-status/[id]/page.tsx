
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { Repair, Technician } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Wrench, CheckCircle, Package, Hourglass, Archive, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'Pending':
            return {
                text: 'Your repair request has been received and is waiting to be assigned.',
                class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
                icon: Hourglass
            };
        case 'In Progress':
            return {
                text: 'A technician is currently working on your device.',
                class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                icon: Wrench
            };
        case 'Ready':
            return {
                text: 'Your device is repaired and ready for pickup!',
                class: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
                icon: CheckCircle
            };
        case 'Archived':
            return {
                text: 'This repair has been completed and archived.',
                class: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
                icon: Archive
            };
        default:
            return {
                text: 'The status of your repair is unknown.',
                class: '',
                icon: Wrench
            };
    }
};

export default function RepairStatusPage() {
    const params = useParams();
    const repairId = params.id as string;
    const [repair, setRepair] = useState<Repair | null>(null);
    const [technicianName, setTechnicianName] = useState('Unassigned');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!repairId) return;

        const fetchRepairAndTechnician = async () => {
            try {
                const repairDocRef = doc(db, 'repairs', repairId);
                const repairDocSnap = await getDoc(repairDocRef);

                if (repairDocSnap.exists()) {
                    const repairData = repairDocSnap.data();
                    const fetchedRepair = {
                        id: repairDocSnap.id,
                        ...repairData,
                        createdAt: repairData.createdAt?.toDate(),
                        readyAt: repairData.readyAt?.toDate(),
                        archivedAt: repairData.archivedAt?.toDate(),
                    } as Repair;
                    setRepair(fetchedRepair);

                    if (fetchedRepair.assignedToName && fetchedRepair.assignedToName !== 'To Be Determined') {
                        const techIdentifier = fetchedRepair.assignedToName.toLowerCase();
                        const techniciansRef = collection(db, 'technicians');
                        
                        // Try finding by name first
                        let techQuery = query(techniciansRef, where("name", "==", fetchedRepair.assignedToName));
                        let techSnapshot = await getDocs(techQuery);
                        
                        // If not found by name, try by email
                        if (techSnapshot.empty) {
                           techQuery = query(techniciansRef, where("email", "==", techIdentifier));
                           techSnapshot = await getDocs(techQuery);
                        }

                        if (!techSnapshot.empty) {
                            const techData = techSnapshot.docs[0].data() as Technician;
                            setTechnicianName(techData.name);
                        } else {
                            setTechnicianName(fetchedRepair.assignedToName); // Fallback to assigned name
                        }
                    }

                } else {
                    setError('No repair found with this ID.');
                }
            } catch (err) {
                console.error("Error fetching repair:", err);
                setError('There was an error retrieving your repair status.');
            } finally {
                setLoading(false);
            }
        };

        fetchRepairAndTechnician();
    }, [repairId]);
    
    const StatusIcon = repair ? getStatusInfo(repair.status).icon : Wrench;


    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="rounded-full bg-primary p-3 text-primary-foreground">
                            <Package className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Repair Status</CardTitle>
                    <CardDescription>
                        Track the progress of your device repair.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading status...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">{error}</div>
                    ) : repair && (
                        <div className="space-y-4">
                             <div className="text-center">
                                <p className="text-sm text-muted-foreground">Repair ID</p>
                                <p className="font-mono text-lg">{repair.id.slice(0, 8)}...</p>
                            </div>

                            <Separator />
                            
                            <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border p-4">
                                <StatusIcon className="h-10 w-10 text-primary" />
                                <Badge className={cn("text-lg", getStatusInfo(repair.status).class)}>
                                    {repair.status}
                                </Badge>
                                <p className="text-center text-sm text-muted-foreground">
                                    {getStatusInfo(repair.status).text}
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Serviced By</h4>
                                <p className="text-muted-foreground">{technicianName}</p>
                            </div>
                             
                             <div className="space-y-2">
                                <h4 className="font-semibold">Device</h4>
                                <p className="text-muted-foreground">{repair.brand} {repair.model}</p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-semibold">Timeline</h4>
                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                    <li>Submitted on {format(repair.createdAt, 'PPP')}</li>
                                    {repair.readyAt && (
                                        <li>Ready for pickup on {format(repair.readyAt, 'PPP')}</li>
                                    )}
                                    {repair.archivedAt && (
                                        <li>Completed on {format(repair.archivedAt, 'PPP')}</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

