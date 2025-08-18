
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad, { SignaturePadRef } from '@/components/signature-pad';
import type { Customer, Repair, Technician } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Computer,
  Smartphone,
  Tablet,
  Gamepad,
  AlertCircle,
  User,
  PlusCircle,
  Eye,
  EyeOff,
  Keyboard,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { MultiSelect, MultiSelectOption } from '../ui/multi-select';
import { Combobox } from '../ui/combobox';
import { useIsMobile } from '@/hooks/use-mobile';


interface RepairCardProps {
  onCreateRepair: (repair: Omit<Repair, 'id' | 'createdAt' | 'readyAt' | 'archivedAt'>) => void;
  technicians: Technician[];
  customers: Customer[];
  preselectedCustomerId?: string | null;
}

const deviceTypes = [
  { value: 'Computer', icon: Computer },
  { value: 'Phone', icon: Smartphone },
  { value: 'Tablet', icon: Tablet },
  { value: 'Console', icon: Gamepad },
  { value: 'Other', icon: AlertCircle },
];

const initialBrandOptions = [
  { value: 'Apple', label: 'Apple' },
  { value: 'Samsung', label: 'Samsung' },
  { value: 'Google', label: 'Google' },
  { value: 'Dell', label: 'Dell' },
  { value: 'HP', label: 'HP' },
  { value: 'Lenovo', label: 'Lenovo' },
  { value: 'Sony', label: 'Sony' },
  { value: 'LG', label: 'LG' },
  { value: 'Microsoft', label: 'Microsoft' },
  { value: 'Nintendo', label: 'Nintendo' },
  { value: 'Other', label: 'Other' },
];

const initialAccessoryOptions: MultiSelectOption[] = [
    { value: 'charger', label: 'Charger' },
    { value: 'case', label: 'Case' },
    { value: 'cable', label: 'Cable' },
    { value: 'headphones', label: 'Headphones' },
];

export function RepairCard({ onCreateRepair, technicians, customers, preselectedCustomerId }: RepairCardProps) {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId ?? '');
  const [deviceType, setDeviceType] = useState('');
  const [brand, setBrand] = useState('');
  const [brandOptions, setBrandOptions] = useState(initialBrandOptions);
  const [model, setModel] = useState('');
  const [passwordPin, setPasswordPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [accessoryOptions, setAccessoryOptions] = useState<MultiSelectOption[]>(initialAccessoryOptions);
  const [problemNotes, setProblemNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const signatureRef = useRef<SignaturePadRef>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [isAddAccessoryOpen, setIsAddAccessoryOpen] = useState(false);
  const [newAccessory, setNewAccessory] = useState('');

  const { toast } = useToast();
  
  useEffect(() => {
    if (preselectedCustomerId) {
      setSelectedCustomerId(preselectedCustomerId);
    }
  }, [preselectedCustomerId]);

  const resetForm = () => {
    setSelectedCustomerId('');
    setDeviceType('');
    setBrand('');
    setModel('');
    setPasswordPin('');
    setShowPassword(false);
    setAccessories([]);
    setProblemNotes('');
    if (user?.role === 'Admin') {
        setAssignedTo('To Be Determined');
    } else if (user?.role === 'Student') {
        const studentTech = technicians.find(t => t.email === user.email);
        setAssignedTo(studentTech?.name ?? '');
    } else {
        setAssignedTo('');
    }
    signatureRef.current?.clear();
    setTypedSignature('');
  }
  
  useEffect(() => {
    if (user?.role === 'Admin') {
        if (!assignedTo) {
            setAssignedTo('To Be Determined');
        }
    } else if (user?.role === 'Student') {
        const studentTech = technicians.find(t => t.email === user.email);
        setAssignedTo(studentTech?.name ?? '');
    }
  }, [technicians, user, assignedTo]);


  const handleCreate = () => {
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please search for and select a customer first.',
        variant: 'destructive',
      });
      return;
    }

    if (!deviceType || !brand || !model || !problemNotes) {
        toast({
            title: 'Missing Information',
            description: 'Please fill out all device and problem details.',
            variant: 'destructive',
        });
        return;
    }
    
    const signatureData = isMobile ? signatureRef.current?.getSignature() : typedSignature;
    if(!signatureData) {
        toast({
            title: 'Signature Required',
            description: 'Please have the customer sign for liability.',
            variant: 'destructive',
        });
        return;
    }
    
    if (!assignedTo) {
      toast({
        title: 'No Technician Assigned',
        description: 'Please assign a technician to this repair.',
        variant: 'destructive',
      });
      return;
    }

    const newRepair = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        deviceType,
        brand,
        model,
        passwordPin,
        accessories,
        problemNotes,
        status: 'Pending' as const,
        signature: signatureData,
        assignedToName: assignedTo,
    };
    
    onCreateRepair(newRepair);
    
    resetForm();
  };
  
  const handleAddNewBrand = () => {
    if (newBrand.trim() && !brandOptions.some(opt => opt.value.toLowerCase() === newBrand.trim().toLowerCase())) {
        const newBrandOption = { value: newBrand.trim(), label: newBrand.trim() };
        setBrandOptions(prev => [newBrandOption, ...prev]);
        setBrand(newBrandOption.value);
        toast({
            title: 'Brand Added',
            description: `"${newBrand.trim()}" has been added and selected.`,
        });
        setNewBrand('');
        setIsAddBrandOpen(false);
    } else if (newBrand.trim()) {
        toast({
            title: 'Brand Exists',
            description: `"${newBrand.trim()}" already exists.`,
            variant: 'destructive',
        });
    }
  };
  
  const handleAddNewAccessory = () => {
    if (newAccessory.trim() && !accessoryOptions.some(opt => opt.value.toLowerCase() === newAccessory.trim().toLowerCase())) {
      const newAccessoryOption = { value: newAccessory.trim(), label: newAccessory.trim() };
      setAccessoryOptions(prev => [newAccessoryOption, ...prev]);
      setAccessories(prev => [...prev, newAccessoryOption.value]);
      toast({
        title: 'Accessory Added',
        description: `"${newAccessory.trim()}" has been added and selected.`,
      });
      setNewAccessory('');
      setIsAddAccessoryOpen(false);
    } else if (newAccessory.trim()) {
      toast({
        title: 'Accessory Exists',
        description: `"${newAccessory.trim()}" already exists.`,
        variant: 'destructive',
      });
    }
  };

  const isAdmin = user?.role === 'Admin';
  const loggedInTechnician = technicians.find(t => t.email === user?.email);
  const customerOptions = (customers || []).map(c => ({ value: c.id, label: `${c.fullName} (${c.email})`}));

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Repair Intake</CardTitle>
        <CardDescription>
          Fill in the details for the new repair job.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="customerSearch">Select Customer</Label>
            <Combobox 
                options={customerOptions}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                placeholder="Select a customer"
                searchPlaceholder="Search customers..."
                noResultsText="No customer found."
            />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deviceType">Device Type</Label>
            <Select value={deviceType} onValueChange={setDeviceType}>
              <SelectTrigger id="deviceType">
                <SelectValue placeholder="Select device type" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map(d => (
                   <SelectItem key={d.value} value={d.value}>
                     <div className="flex items-center gap-2">
                       <d.icon className="h-4 w-4 text-muted-foreground" />
                       <span>{d.value}</span>
                     </div>
                   </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <div className="flex gap-2">
                <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger id="brand">
                        <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                        {brandOptions.map(b => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setIsAddBrandOpen(true)} aria-label="Add new brand">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" placeholder="e.g., iPhone 14, XPS 15" value={model} onChange={e => setModel(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="passwordPin">Device Password / PIN</Label>
                <div className="relative">
                    <Input id="passwordPin" type={showPassword ? 'text' : 'password'} placeholder="Enter device password or PIN" value={passwordPin} onChange={e => setPasswordPin(e.target.value)} />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(p => !p)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
             <Label htmlFor="accessories">Accessories</Label>
             <div className="flex gap-2">
                <MultiSelect
                    selected={accessories}
                    onChange={setAccessories}
                    options={accessoryOptions}
                    placeholder="Select accessories..."
                />
                <Button variant="outline" size="icon" onClick={() => setIsAddAccessoryOpen(true)} aria-label="Add new accessory">
                    <PlusCircle className="h-4 w-4" />
                </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Serviced By</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!isAdmin}>
                <SelectTrigger id="assignedTo">
                    <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                    {isAdmin ? (
                        <>
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
                        </>
                    ) : (
                        loggedInTechnician && (
                            <SelectItem value={loggedInTechnician.name}>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{loggedInTechnician.name}</span>
                                </div>
                            </SelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
            </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="problemNotes">Problem Notes</Label>
          <Textarea
            id="problemNotes"
            placeholder="Describe the issue in detail…"
            value={problemNotes}
            onChange={e => setProblemNotes(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Customer Liability Signature</Label>
          {isMobile ? (
            <SignaturePad ref={signatureRef} width={500} height={200} />
          ) : (
            <div className="relative">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type full name to sign"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="pl-9 font-signature text-2xl h-12"
              />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => {
            if (isMobile) {
                signatureRef.current?.clear()
            } else {
                setTypedSignature('')
            }
        }}>
          Clear Signature
        </Button>
        <Button onClick={handleCreate}>Create Repair Ticket</Button>
      </CardFooter>

      <Dialog open={isAddBrandOpen} onOpenChange={setIsAddBrandOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>
              Enter the name of the new brand you want to add to the list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="newBrand">Brand Name</Label>
            <Input id="newBrand" value={newBrand} onChange={e => setNewBrand(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewBrand()} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddNewBrand}>Add Brand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddAccessoryOpen} onOpenChange={setIsAddAccessoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Accessory</DialogTitle>
            <DialogDescription>
              Enter the name of the new accessory you want to add to the list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="newAccessory">Accessory Name</Label>
            <Input id="newAccessory" value={newAccessory} onChange={e => setNewAccessory(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewAccessory()} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddNewAccessory}>Add Accessory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
