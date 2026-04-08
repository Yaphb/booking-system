import { useAuth } from '../context/AuthContext';
import { X, Clock } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
  createdAt?: string;
}

interface Room {
  id: string;
  name: string;
}

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings?: Booking[];
  rooms?: Room[];
}

export default function MyBookingsModal({ isOpen, onClose, bookings = [], rooms = [] }: MyBookingsModalProps) {
  const { user } = useAuth();

  if (!user) return null;

  const userBookings = bookings.filter(b => b.userId === user.id);
  const activeBookings = userBookings.filter(b => b.status === 'confirmed' && !isPast(parseISO(b.date)));
  const pastBookings = userBookings.filter(b => isPast(parseISO(b.date)) || b.status === 'cancelled');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onClose} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-black/10">
              <h2 className="text-xl font-bold">Your Bookings</h2>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-black/5 hover:rotate-90 rounded-full transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {userBookings.length === 0 ? (
                <p className="text-black/50 text-center py-8">No bookings yet. Browse rooms to make your first reservation!</p>
              ) : (
                <div className="space-y-6">
                  {activeBookings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-black/60 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Upcoming
                      </h3>
                      <div className="space-y-3">
                        {activeBookings.map(booking => {
                          const room = rooms.find(r => r.id === booking.roomId);
                          const bookingDate = parseISO(booking.date);
                          const isBookingToday = isToday(bookingDate);
                          return (
                            <div 
                              key={booking.id} 
                              className={cn(
                                "p-4 rounded-lg border",
                                isBookingToday ? "border-black bg-black/5" : "border-black/10"
                              )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{room?.name || 'Room'}</h4>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  isBookingToday ? "bg-black text-white" : "bg-black/10 text-black/60"
                                )}>
                                  {isBookingToday ? 'Today' : format(bookingDate, 'MMM d')}
                                </span>
                              </div>
                              <div className="text-sm text-black/60">
                                {format(bookingDate, 'EEEE, MMMM d, yyyy')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pastBookings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-black/40 mb-3">Past Reservations</h3>
                      <div className="space-y-2">
                        {pastBookings.slice(0, 5).map(booking => {
                          const room = rooms.find(r => r.id === booking.roomId);
                          return (
                            <div key={booking.id} className="p-3 rounded-lg border border-black/5 bg-black/5">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-black/60">{room?.name || 'Room'}</span>
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  booking.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-black/10 text-black/40"
                                )}>
                                  {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                </span>
                              </div>
                              <div className="text-xs text-black/40 mt-1">
                                {format(parseISO(booking.date), 'MMM d, yyyy')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}