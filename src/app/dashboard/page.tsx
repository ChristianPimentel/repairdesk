
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RepairsList } from '@/components/dashboard/repairs-list';
import type { Repair } from '@/lib/types';
import { useUser } from '@/context/UserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReadyRepairsList } from '@/components/dashboard/ready-repairs-list';
import { InProgressRepairsList } from '@/components/dashboard/in-progress-repairs-list';

export default function DashboardPage() {
  const { user, technicians, repairs } = useUser();
  const router = useRouter();
  
  const handleViewDetails = (repair: Repair) => {
    router.push(`/dashboard/repairs/${repair.id}`);
  }

  const repairsForUser = user?.role === 'Admin' 
    ? repairs 
    : repairs.filter(r => r.assignedToName.toLowerCase() === user?.email.toLowerCase() || technicians.find(t => t.email.toLowerCase() === user?.email.toLowerCase())?.name.toLowerCase() === r.assignedToName.toLowerCase());

  
  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="mt-6 lg:mt-8">
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active Repairs</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="ready">Ready</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              <RepairsList repairs={repairsForUser} technicians={technicians} onViewDetails={handleViewDetails} />
            </TabsContent>
            <TabsContent value="in-progress">
              <InProgressRepairsList repairs={repairsForUser} technicians={technicians} onViewDetails={handleViewDetails} />
            </TabsContent>
            <TabsContent value="ready">
              <ReadyRepairsList repairs={repairsForUser} technicians={technicians} onViewDetails={handleViewDetails} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
