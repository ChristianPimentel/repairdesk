
'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser } from '@/context/UserContext';
import type { Repair } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ArchivePage() {
  const { user, technicians, repairs, donations } = useUser();
  const router = useRouter();

  const getTechnicianName = (techIdentifier: string): string => {
    if (!technicians || !techIdentifier) return 'Unassigned';
    
    const identifier = techIdentifier.toLowerCase();
    
    const technicianByEmail = technicians.find(t => t.email.toLowerCase() === identifier);
    if (technicianByEmail) return technicianByEmail.name;

    const technicianByName = technicians.find(t => t.name.toLowerCase() === identifier);
    if (technicianByName) return technicianByName.name;

    return techIdentifier;
  };

  const archivedRepairs = useMemo(() => {
    return (repairs || []).filter(r => r.status === 'Archived');
  }, [repairs]);
  
  const groupedRepairs = useMemo(() => {
    const repairsToGroup = user?.role === 'Admin' 
      ? archivedRepairs 
      : archivedRepairs.filter(r => getTechnicianName(r.assignedToName).toLowerCase() === technicians.find(t => t.email.toLowerCase() === user?.email.toLowerCase())?.name.toLowerCase());
      
    return repairsToGroup.reduce((acc, repair) => {
        const techName = getTechnicianName(repair.assignedToName);
        if (!acc[techName]) {
          acc[techName] = [];
        }
        acc[techName].push(repair);
        return acc;
      }, {} as Record<string, Repair[]>);
  }, [archivedRepairs, user, technicians]);
  
  const handleViewDetails = (repair: Repair) => {
    router.push(`/dashboard/repairs/${repair.id}`);
  };

  const handleDonate = (e: React.MouseEvent, repair: Repair) => {
    e.stopPropagation();
    const query = new URLSearchParams({
        customerId: repair.customerId,
        deviceType: repair.deviceType,
        brand: repair.brand,
        model: repair.model,
    }).toString();
    router.push(`/dashboard/donations?${query}`);
  }

  const isDonated = (repair: Repair) => {
    return donations.some(d => 
        d.customerId === repair.customerId &&
        d.deviceType === repair.deviceType &&
        d.brand === repair.brand &&
        d.model === repair.model
    );
  }

  const sortedTechnicianNames = Object.keys(groupedRepairs).sort();

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Archived Repairs</CardTitle>
            <CardDescription>
              A list of all completed and archived repair jobs, organized by technician.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedTechnicianNames.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {sortedTechnicianNames.map((techName) => (
                        <AccordionItem value={techName} key={techName}>
                            <AccordionTrigger>
                                {techName} ({groupedRepairs[techName].length} repairs)
                            </AccordionTrigger>
                            <AccordionContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Device</TableHead>
                                            <TableHead className="hidden sm:table-cell">Created</TableHead>
                                            <TableHead className="hidden md:table-cell">Archived</TableHead>
                                            {user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedRepairs[techName].map((repair) => (
                                            <TableRow key={repair.id} onClick={() => handleViewDetails(repair)} className="cursor-pointer">
                                                <TableCell>{repair.customerName}</TableCell>
                                                <TableCell>{repair.brand} {repair.model}</TableCell>
                                                <TableCell className="hidden sm:table-cell">{format(repair.createdAt, 'PP')}</TableCell>
                                                <TableCell className="hidden md:table-cell">{repair.archivedAt ? format(repair.archivedAt, 'PP') : 'N/A'}</TableCell>
                                                {user?.role === 'Admin' && (
                                                    <TableCell className="text-right">
                                                        {isDonated(repair) ? (
                                                            <Badge variant="secondary">Donated</Badge>
                                                        ) : (
                                                            <Button variant="outline" size="sm" onClick={(e) => handleDonate(e, repair)}>
                                                                <Gift className="mr-2 h-4 w-4" />
                                                                Donate
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No archived repairs found.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
