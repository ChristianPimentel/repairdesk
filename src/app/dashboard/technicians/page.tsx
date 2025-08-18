
'use client';

import React from 'react';
import { TechnicianCard } from '@/components/dashboard/technician-card';
import { useUser } from '@/context/UserContext';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';

export default function TechniciansPage() {
    const { user, technicians } = useUser();

    if (user?.role !== 'Admin') {
        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not have permission to view this page.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <Card>
                <CardHeader>
                    <CardTitle>Manage Technicians</CardTitle>
                    <CardDescription>
                        Add, edit, or remove technicians from your team.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TechnicianCard technicians={technicians} />
                </CardContent>
            </Card>
        </div>
    )
}
