import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Mail, Shield, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

interface Booking {
  id: string;
  roomId: string;
  date: string;
  status: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    Promise.all([
      fetch('/api/bookings').then(res => res.json()),
      fetch('/api/rooms').then(res => res.json())
    ]).then(([bookingsData, roomsData]) => {
      const userBookings = bookingsData.filter((b: any) => b.userId === user.id);
      const sortedBookings = userBookings.sort((a: Booking, b: Booking) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setBookings(sortedBookings);

      const roomMap: Record<string, Room> = {};
      roomsData.forEach((r: Room) => {
        roomMap[r.id] = r;
      });
      setRooms(roomMap);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch profile data', err);
      setLoading(false);
    });
  }, [user, navigate]);

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-black/60 mt-2">Manage your account and view your booking history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-black/10 rounded-xl p-6 shadow-sm">
            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-black/40" />
            </div>
            <h2 className="text-xl font-semibold mb-1">{user.name}</h2>
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 text-sm text-black/70">
                <Mail className="w-4 h-4 text-black/40" />
                {user.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-black/70">
                <Shield className="w-4 h-4 text-black/40" />
                <span className="capitalize">{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-black/10 bg-black/5 flex justify-between items-center">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" /> My Bookings
              </h2>
              <span className="text-sm text-black/60">{bookings.length} total</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-black/50">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center text-black/50">
                You haven't made any bookings yet.
              </div>
            ) : (
              <div className="divide-y divide-black/10">
                {bookings.map(booking => (
                  <div key={booking.id} className="p-6 hover:bg-black/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{rooms[booking.roomId]?.name || 'Unknown Room'}</h3>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        booking.status === 'confirmed' ? "bg-black text-white" : "bg-black/10 text-black/60"
                      )}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-black/60 mt-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(parseISO(booking.date), 'MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Booked {format(parseISO(booking.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
