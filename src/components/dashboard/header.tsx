
'use client';

import {
  LogOut,
  Users,
  Home,
  UserSquare,
  Archive,
  Gift,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useUser } from '@/context/UserContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { CustomIcon } from '../icons/custom-icon';
import { useState } from 'react';

export function Header() {
  const router = useRouter();
  const { user, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/customers', label: 'Customers', icon: UserSquare },
    { href: '/dashboard/archive', label: 'Archive', icon: Archive },
  ];

  if (user?.role === 'Admin') {
    navLinks.splice(1, 0, { href: '/dashboard/admins', label: 'Admins', icon: Shield });
    navLinks.splice(3, 0, { href: '/dashboard/technicians', label: 'Technicians', icon: Users });
    navLinks.push({ href: '/dashboard/donations', label: 'Donations', icon: Gift });
  }
  
  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CustomIcon className="h-6 w-6 transition-all group-hover:scale-110" />
          </div>
          <span className="font-bold text-xl hidden sm:inline-block">RepairDesk Lite</span>
        </Link>
        {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
            </Link>
        ))}
      </nav>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation links for the application.</SheetDescription>
          </SheetHeader>
          <nav className="grid gap-6 text-lg font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
            onClick={handleLinkClick}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CustomIcon className="h-6 w-6 transition-all group-hover:scale-110" />
            </div>
            <span className="font-bold text-xl">RepairDesk Lite</span>
          </Link>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={handleLinkClick} className="flex items-center gap-4 text-muted-foreground hover:text-foreground">
                <link.icon className="h-5 w-5" />
                {link.label}
            </Link>
        ))}
          </nav>
        </SheetContent>
      </Sheet>
      
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
          {/* Future search bar could go here */}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                 <AvatarImage src={undefined} alt={user?.email ?? ''} />
                <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email} ({user?.role})</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === 'Admin' && (
                <>
                 <DropdownMenuItem onClick={() => router.push('/dashboard/admins')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admins</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push('/dashboard/technicians')}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Technicians</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                </>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
