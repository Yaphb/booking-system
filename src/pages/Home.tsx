import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, CreditCard, CheckCircle2, X, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfToday } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';

interface Room {
  id: string;
  name: string;
  capacity: number;
  price: number;
  image: string;
  description: string;
}

interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
  createdAt?: string;
}

interface HomeProps {
  onBookingsChange?: (bookings: Booking[]) => void;
}

const ITEMS_PER_PAGE = 6;

export default function Home({ onBookingsChange }: HomeProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<number | ''>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (onBookingsChange) {
      onBookingsChange(bookings);
    }
  }, [bookings, onBookingsChange]);

  useEffect(() => {
    Promise.all([
      fetch('/api/rooms').then(res => res.json()),
      fetch('/api/bookings').then(res => res.json())
    ])
      .then(([roomsData, bookingsData]) => {
        setRooms(roomsData);
        setBookings(bookingsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data', err);
        setLoading(false);
      });

    // Setup WebSocket
    const socket = io();
    
    socket.on('booking:created', (newBooking: Booking) => {
      setBookings(prev => [...prev, newBooking]);
    });

    socket.on('booking:updated', (updatedBooking: Booking) => {
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, capacityFilter]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            room.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCapacity = capacityFilter === '' || room.capacity >= capacityFilter;
      return matchesSearch && matchesCapacity;
    });
  }, [rooms, searchTerm, capacityFilter]);

  const totalPages = Math.ceil(filteredRooms.length / ITEMS_PER_PAGE);
  const paginatedRooms = filteredRooms.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading rooms...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-12"
    >
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold tracking-tight"
        >
          Book your perfect space.
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-black/60"
        >
          Minimalist, modern rooms for your next stay or meeting. Experience simplicity at its finest.
        </motion.p>
      </section>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
          <input 
            type="text" 
            placeholder="Search rooms..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
          />
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
          <select 
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white appearance-none cursor-pointer"
          >
            <option value="">Any Capacity</option>
            <option value="1">1+ People</option>
            <option value="2">2+ People</option>
            <option value="4">4+ People</option>
            <option value="8">8+ People</option>
          </select>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {paginatedRooms.map((room, index) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              key={room.id} 
              className="group cursor-pointer flex flex-col border-2 border-black/10 rounded-xl overflow-hidden hover:border-black/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-white" 
              onClick={() => setSelectedRoom(room)}
            >
              <div className="aspect-[4/3] overflow-hidden bg-black/5">
                <img 
                  src={room.image} 
                  alt={room.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold group-hover:text-black/80 transition-colors">{room.name}</h3>
                  <span className="font-mono font-medium">${room.price}<span className="text-sm text-black/50">/day</span></span>
                </div>
                <p className="text-sm text-black/60 mb-4 flex-1">{room.description}</p>
                <div className="flex items-center gap-4 text-sm text-black/70 mt-auto pt-4 border-t border-black/5">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Up to {room.capacity}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 text-black/50">
          No rooms found matching your criteria.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-full border border-black/10 hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full border border-black/10 hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedRoom && (
          <BookingModal 
            room={selectedRoom} 
            bookings={bookings}
            onClose={() => setSelectedRoom(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BookingModal({ room, bookings, onClose }: { room: Room, bookings: Booking[], onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [step, setStep] = useState<'date' | 'payment' | 'confirm' | 'success'>('date');
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState('');

  // Generate next 14 days
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  const handleContinue = () => {
    if (!user) {
      navigate('/login', { state: { returnTo: '/' } });
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    setIsBooking(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          userId: user?.id,
          userName: user?.name,
          date: format(selectedDate, 'yyyy-MM-dd')
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Booking failed');
      }
      
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-black/10">
          <h2 className="text-xl font-semibold">{room.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 hover:rotate-90 rounded-full transition-all duration-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'date' && (
              <motion.div 
                key="date"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" /> Select Date
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {dates.map(date => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isBooked = bookings.some(b => b.roomId === room.id && b.date === dateStr && b.status === 'confirmed');
                      const isSelected = date.getTime() === selectedDate.getTime();
                      
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => !isBooked && setSelectedDate(date)}
                          disabled={isBooked}
                          className={cn(
                            "p-3 rounded-lg border text-center transition-all duration-200",
                            isBooked 
                              ? "border-black/5 bg-black/5 text-black/40 cursor-not-allowed line-through" 
                              : isSelected 
                                ? "border-black bg-black text-white scale-105 shadow-md" 
                                : "border-black/10 hover:border-black/30 hover:bg-black/5 active:scale-95"
                          )}
                        >
                          <div className="text-xs opacity-70">{format(date, 'EEE')}</div>
                          <div className="font-medium">{format(date, 'd')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-black/5 p-4 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium">Total Price</span>
                  <span className="text-lg font-bold">${room.price}</span>
                </div>

                <button 
                  onClick={handleContinue}
                  className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-black/90 active:scale-[0.98] transition-all"
                >
                  {user ? 'Continue to Payment' : 'Login to Book'}
                </button>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div 
                key="payment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="bg-black/5 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black/60">Room</span>
                    <span className="font-medium">{room.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/60">Date</span>
                    <span className="font-medium">{format(selectedDate, 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-black/10">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">${room.price}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Payment Method</h3>
                  <button 
                    onClick={() => setStep('confirm')}
                    disabled={isBooking}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-medium hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    <CreditCard className="w-5 h-5" />
                    {isBooking ? 'Processing...' : 'Confirm Booking'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">Confirm Your Booking</h3>
                  <div className="bg-black/5 p-4 rounded-lg space-y-3 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-black/60">Room</span>
                      <span className="font-medium">{room.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/60">Date</span>
                      <span className="font-medium">{format(selectedDate, 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-black/10">
                      <span className="font-medium">Total Price</span>
                      <span className="font-bold">${room.price}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setStep('payment')}
                    className="flex-1 py-3 rounded-lg font-medium border border-black/20 hover:bg-black/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePayment}
                    disabled={isBooking}
                    className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-3 rounded-lg font-medium hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    <CreditCard className="w-5 h-5" />
                    {isBooking ? 'Processing...' : 'Pay & Book'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-8 h-8" />
                </motion.div>
                <h3 className="text-2xl font-bold">Booking Confirmed!</h3>
                <p className="text-black/60">
                  Your reservation for {room.name} on {format(selectedDate, 'MMM d, yyyy')} is set.
                </p>
                <button 
                  onClick={onClose}
                  className="mt-8 px-6 py-2 border border-black rounded-lg font-medium hover:bg-black hover:text-white active:scale-95 transition-all"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
