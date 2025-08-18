
'use client';

import React from 'react';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Repair, RepairStatus, Technician } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReadyRepairsListProps {
  repairs: Repair[];
  technicians: Technician[];
  onViewDetails: (repair: Repair) => void;
}

export function ReadyRepairsList({ repairs, technicians, onViewDetails }: ReadyRepairsListProps) {
  const { toast } = useToast();

  const handleStatusChange = async (repairId: string, newStatus: RepairStatus) => {
    try {
        const repairRef = doc(db, 'repairs', repairId);
        const updateData: any = { status: newStatus };

        if (newStatus === 'Archived') {
            updateData.archivedAt = serverTimestamp();
        }
        if (newStatus !== 'Ready') {
            updateData.readyAt = null;
        }
        
        await updateDoc(repairRef, updateData);
        
        toast({
            title: "Status Updated",
            description: `Repair #${repairId.slice(-4)} status changed to ${newStatus}.`,
        });

    } catch (error) {
        console.error("Error updating status: ", error);
        toast({
            title: 'Error',
            description: 'Could not update repair status.',
            variant: 'destructive'
        });
    }
  };

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

  const getTechnicianName = (techIdentifier: string): string => {
    if (!technicians || !techIdentifier) return 'Unassigned';
    
    const identifier = techIdentifier.toLowerCase();
    
    const technicianByEmail = technicians.find(t => t.email.toLowerCase() === identifier);
    if (technicianByEmail) return technicianByEmail.name;

    const technicianByName = technicians.find(t => t.name.toLowerCase() === identifier);
    if (technicianByName) return technicianByName.name;

    return techIdentifier;
  };

  const readyRepairs = (repairs || []).filter(r => r.status === 'Ready');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ready for Pickup</CardTitle>
        <CardDescription>
          A list of repairs that have been completed and are ready for customer pickup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Device</TableHead>
              <TableHead className="hidden lg:table-cell">Serviced By</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="hidden md:table-cell">Ready On</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readyRepairs.length > 0 ? readyRepairs.map((repair) => (
              <TableRow key={repair.id} onClick={() => onViewDetails(repair)} className="cursor-pointer">
                <TableCell>
                    <div className="font-medium">{repair.customerName}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{repair.brand} {repair.model}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{repair.brand} {repair.model}</TableCell>
                <TableCell className="hidden lg:table-cell">{getTechnicianName(repair.assignedToName)}</TableCell>
                <TableCell className="hidden sm:table-cell">{format(repair.createdAt, 'PP')}</TableCell>
                <TableCell className="hidden md:table-cell">{repair.readyAt ? format(repair.readyAt, 'PP') : 'N/A'}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                   <Select value={repair.status} onValueChange={(value) => handleStatusChange(repair.id, value as RepairStatus)}>
                    <SelectTrigger className="w-36">
                       <SelectValue>
                        <Badge variant="outline" className={cn("border", getStatusClass(repair.status))}>{repair.status}</Badge>
                       </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  No repairs are ready for pickup.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
