
'use client';

import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Repair, RepairStatus, Technician } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { KeyRound, User } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from '@/components/ui/tooltip';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/UserContext';


interface RepairsListProps {
  repairs: Repair[];
  technicians: Technician[];
  onViewDetails: (repair: Repair) => void;
}

export function RepairsList({ repairs, technicians, onViewDetails }: RepairsListProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const handleStatusChange = async (repairId: string, newStatus: RepairStatus) => {
    try {
        const repairRef = doc(db, 'repairs', repairId);
        const updateData: any = { status: newStatus };

        if (newStatus === 'Ready') {
            updateData.readyAt = serverTimestamp();
        }
        if (newStatus === 'Archived') {
            updateData.archivedAt = serverTimestamp();
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
  
  const handleAssignTech = async (repairId: string, techName: string) => {
    if (techName === 'To Be Determined') return;
    try {
        const repairRef = doc(db, 'repairs', repairId);
        await updateDoc(repairRef, { assignedToName: techName });
        toast({
            title: "Technician Assigned",
            description: `Repair assigned to ${techName}.`,
        });
    } catch (error) {
        console.error("Error assigning technician: ", error);
        toast({
            title: 'Error',
            description: 'Could not assign technician.',
            variant: 'destructive'
        });
    }
  };

  const togglePasswordVisibility = (repairId: string) => {
    setVisiblePasswords(prev => ({...prev, [repairId]: !prev[repairId]}));
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
    if (!technicians || !techIdentifier || techIdentifier === 'To Be Determined') return 'To Be Determined';
    
    const identifier = techIdentifier.toLowerCase();
    
    const technicianByEmail = technicians.find(t => t.email.toLowerCase() === identifier);
    if (technicianByEmail) return technicianByEmail.name;

    const technicianByName = technicians.find(t => t.name.toLowerCase() === identifier);
    if (technicianByName) return technicianByName.name;

    return techIdentifier;
  };

  const activeRepairs = (repairs || []).filter(r => r.status === 'Pending');
  const isAdmin = user?.role === 'Admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Repairs</CardTitle>
        <CardDescription>
          An overview of all ongoing repair jobs. Click a row to see more details.
        </CardDescription>
      </CardHeader>
      <CardContent>
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Device</TableHead>
              <TableHead className="hidden lg:table-cell">Serviced By</TableHead>
              <TableHead className="hidden md:table-cell">Issue</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeRepairs.length > 0 ? activeRepairs.map((repair) => (
              <TableRow key={repair.id} onClick={() => onViewDetails(repair)} className="cursor-pointer">
                <TableCell>
                    <div className="font-medium">{repair.customerName}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{repair.brand} {repair.model}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{repair.brand} {repair.model}</TableCell>
                <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                        <Select
                            value={getTechnicianName(repair.assignedToName)}
                            onValueChange={(value) => handleAssignTech(repair.id, value)}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="To Be Determined">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>To Be Determined</span>
                                    </div>
                                </SelectItem>
                                {technicians.map(t => (
                                    <SelectItem key={t.id} value={t.name}>
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span>{t.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        getTechnicianName(repair.assignedToName)
                    )}
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate">{repair.problemNotes}</TableCell>
                <TableCell className="hidden sm:table-cell">{format(repair.createdAt, 'PP')}</TableCell>
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
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {repair.passwordPin && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => togglePasswordVisibility(repair.id)}>
                                    <KeyRound className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{visiblePasswords[repair.id] ? repair.passwordPin : '••••••••'}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  No active repairs.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
