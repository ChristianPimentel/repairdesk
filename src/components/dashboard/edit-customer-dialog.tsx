
'use client';

import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface EditCustomerDialogProps {
  customer: Customer;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditCustomerDialog({ customer, isOpen, onOpenChange }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (customer) {
      setFullName(customer.fullName);
      setEmail(customer.email);
      setPhone(customer.phone);
    }
  }, [customer]);

  const handleSaveChanges = async () => {
    if (!fullName || (!email && !phone)) {
        toast({
          title: 'Missing Information',
          description: 'Please provide a name and at least an email or phone number.',
          variant: 'destructive',
        });
        return;
      }

    try {
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        fullName,
        email,
        phone,
      });
      toast({
        title: 'Customer Updated',
        description: `${fullName}'s details have been successfully updated.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating customer: ', error);
      toast({
        title: 'Error',
        description: 'Could not update customer details.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update the details for {customer.fullName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
