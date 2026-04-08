import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, LogOut, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import MyBookingsModal from './MyBookingsModal';

interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
  createdAt?: string;
}

interface LayoutProps {
  bookings?: Booking[];
}

export default function Layout({ bookings = [] }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showBookings, setShowBookings] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; name: string; }[]>([]);

  useEffect(() => {
    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => setRooms(data))
      .catch(err => console.error('Failed to fetch rooms', err));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <header className="border-b border-black/10 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-black text-white p-1.5 rounded-md group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight">MinimalBook</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-black/60 transition-colors">Rooms</Link>
            {user && (
              <button 
                onClick={() => setShowBookings(true)}
                className="text-sm font-medium hover:text-black/60 transition-colors"
              >
                My Bookings
              </button>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium hover:text-black/60 transition-colors">Dashboard</Link>
            )}
            
            {user ? (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-black/10">
                <Link to="/profile" className="text-sm text-black/60 hover:text-black transition-colors flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  {user.name}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-black hover:text-black/60 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-black/10">
                <Link to="/login" className="text-sm font-medium hover:text-black/60 transition-colors">Login</Link>
                <Link to="/register" className="text-sm font-medium bg-black text-white px-4 py-2 rounded-md hover:bg-black/80 transition-colors">
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
        <Outlet />
      </main>

      <footer className="border-t border-black/10 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-black/40">
          &copy; {new Date().getFullYear()} MinimalBook. All rights reserved.
        </div>
      </footer>

      <MyBookingsModal 
        isOpen={showBookings} 
        onClose={() => setShowBookings(false)} 
        bookings={bookings} 
        rooms={rooms} 
      />
    </div>
  );
}
