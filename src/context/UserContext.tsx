
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, Technician, Repair, Customer, Donation, Admin } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  technicians: Technician[];
  repairs: Repair[];
  setRepairs: React.Dispatch<React.SetStateAction<Repair[]>>;
  customers: Customer[];
  donations: Donation[];
  admins: Admin[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);

  useEffect(() => {
    setLoading(true);
    try {
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    } catch (error) {
        console.error("Failed to parse user from sessionStorage", error);
        sessionStorage.removeItem('user');
    }
    
    const techniciansQuery = query(collection(db, 'technicians'), orderBy('name'));
    const repairsQuery = query(collection(db, 'repairs'), orderBy('createdAt', 'desc'));
    const customersQuery = query(collection(db, 'customers'), orderBy('fullName'));
    const donationsQuery = query(collection(db, 'donations'), orderBy('donatedAt', 'desc'));
    const adminsQuery = query(collection(db, 'admins'), orderBy('email'));

    
    const unsubTechnicians = onSnapshot(techniciansQuery, (snapshot) => {
        const techniciansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
        setTechnicians(techniciansData);
    });

    const unsubRepairs = onSnapshot(repairsQuery, (snapshot) => {
        const repairsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
                readyAt: data.readyAt?.toDate(),
                archivedAt: data.archivedAt?.toDate(),
            } as Repair;
        });
        setRepairs(repairsData);
    });

    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
        const customersData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate(),
            } as Customer;
        });
        setCustomers(customersData);
    });
    
    const unsubDonations = onSnapshot(donationsQuery, (snapshot) => {
        const donationsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                donatedAt: data.donatedAt?.toDate(),
            } as Donation;
        });
        setDonations(donationsData);
    });

    const unsubAdmins = onSnapshot(adminsQuery, (snapshot) => {
        const adminsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Admin));
        setAdmins(adminsData);
    });

    setLoading(false);

    // Cleanup function
    return () => {
        unsubTechnicians();
        unsubRepairs();
        unsubCustomers();
        unsubDonations();
        unsubAdmins();
    };

  }, []);

  const login = (userData: User) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('tempUser');
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, technicians, repairs, setRepairs, customers, donations, admins }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
