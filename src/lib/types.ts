
export type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
};

export type RepairStatus = 'Pending' | 'In Progress' | 'Ready' | 'Archived';

export type Repair = {
  id: string;
  customerName: string;
  customerId: string;
  deviceType: 'Computer' | 'Phone' | 'Tablet' | 'Console' | string;
  brand: string;
  model: string;
  accessories: string[];
  problemNotes: string;
  passwordPin?: string;
  status: RepairStatus;
  assignedToName: string;
  signature: string | null;
  createdAt: Date;
  readyAt: Date | null;
  archivedAt: Date | null;
};

export type Technician = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  forcePasswordChange?: boolean;
};

export type Admin = {
  id: string;
  email: string;
  password?: string;
  forcePasswordChange?: boolean;
}

export type User = {
    email: string;
    role: 'Admin' | 'Student';
}

export type Donation = {
  id: string;
  customerName: string;
  customerId: string;
  deviceType: string;
  brand: string;
  model: string;
  notes: string;
  donatedAt: Date;
  receivedBy: string;
};
