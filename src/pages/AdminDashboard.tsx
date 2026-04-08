import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Search, Filter, ChevronLeft, ChevronRight, AlertTriangle, X, Download, Users, Calendar as CalendarIcon, List, ChevronDown, ChevronUp, Trash2, Edit2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { io } from 'socket.io-client';

interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ITEMS_PER_PAGE = 10;

type SortField = 'userName' | 'roomName' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'calendar' | 'users'>('bookings');

  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Cancellation Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Expanded Rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // User Role Editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch('/api/bookings').then(res => res.json()),
      fetch('/api/rooms').then(res => res.json()),
      fetch('/api/users').then(res => res.json())
    ]).then(([bookingsData, roomsData, usersData]) => {
      const sortedBookings = bookingsData.sort((a: Booking, b: Booking) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setBookings(sortedBookings);
      
      const roomMap: Record<string, Room> = {};
      roomsData.forEach((r: Room) => {
        if (r && r.id) {
          roomMap[r.id] = r;
        }
      });
      setRooms(roomMap);
      setUsers(usersData || []);
      
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch admin data', err);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();

    // Setup WebSocket
    const socket = io();
    
    socket.on('booking:created', (newBooking: Booking) => {
      setBookings(prev => {
        const newBookings = [newBooking, ...prev];
        return newBookings.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      });
    });

    socket.on('booking:updated', (updatedBooking: Booking) => {
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
    });

    socket.on('user:created', (newUser: User) => {
      setUsers(prev => [...prev, newUser]);
    });

    socket.on('user:updated', (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    });

    socket.on('user:deleted', (deletedId: string) => {
      setUsers(prev => prev.filter(u => u.id !== deletedId));
    });

    return () => {
      socket.disconnect();
    };
  }, [user, navigate]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roomFilter]);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter(booking => {
        const roomName = rooms[booking.roomId]?.name || '';
        const userName = booking.userName || booking.userId || '';
        
        const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              booking.id.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === '' || booking.status === statusFilter;
        const matchesRoom = roomFilter === '' || booking.roomId === roomFilter;
        
        return matchesSearch && matchesStatus && matchesRoom;
      })
      .sort((a, b) => {
        let aVal: string = '';
        let bVal: string = '';
        
        switch (sortField) {
          case 'userName':
            aVal = a.userName || a.userId || '';
            bVal = b.userName || b.userId || '';
            break;
          case 'roomName':
            aVal = rooms[a.roomId]?.name || '';
            bVal = rooms[b.roomId]?.name || '';
            break;
          case 'date':
            aVal = a.date;
            bVal = b.date;
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
        }
        
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [bookings, rooms, searchTerm, statusFilter, roomFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCancelClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingToCancel(booking);
    setCancelModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (!bookingToCancel) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingToCancel.id}/cancel`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to cancel');
      
      setCancelModalOpen(false);
      setBookingToCancel(null);
    } catch (err) {
      console.error(err);
      alert('Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const exportCSV = () => {
    const headers = ['ID', 'User Name', 'User ID', 'Room Name', 'Room ID', 'Date', 'Status', 'Booked At'];
    const rows = filteredBookings.map(b => [
      b.id,
      b.userName || '',
      b.userId,
      rooms[b.roomId]?.name || '',
      b.roomId,
      b.date,
      b.status,
      b.createdAt
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(item => `"${item}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-black/60 mt-2">Manage reservations, users, and system settings.</p>
        </div>
        
        <div className="flex bg-black/5 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'bookings' ? "bg-white shadow-sm" : "hover:bg-black/5")}
          >
            <List className="w-4 h-4" /> Bookings
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'calendar' ? "bg-white shadow-sm" : "hover:bg-black/5")}
          >
            <CalendarIcon className="w-4 h-4" /> Calendar
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'users' ? "bg-white shadow-sm" : "hover:bg-black/5")}
          >
            <Users className="w-4 h-4" /> Users
          </button>
        </div>
      </div>

      {activeTab === 'bookings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/40" />
              <input 
                type="text" 
                placeholder="Search by user, room, or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white text-sm"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative w-full md:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                <select 
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white appearance-none cursor-pointer text-sm"
                >
                  <option value="">All Rooms</option>
                  {Object.values(rooms).map((room: Room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative w-full md:w-40">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-black/10 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white appearance-none cursor-pointer text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button 
                onClick={exportCSV}
                className="flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-black/90 transition-colors"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-black/10 bg-black/5 flex justify-between items-center">
              <h2 className="font-semibold text-lg">Recent Bookings</h2>
              <span className="text-sm text-black/60">{filteredBookings.length} total</span>
            </div>
            
            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center text-black/50">
                No bookings found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/5 text-black/60 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3 font-medium w-10"></th>
                      <th className="px-6 py-3 font-medium cursor-pointer hover:bg-black/10" onClick={() => { setSortField('userName'); setSortDirection(sortField === 'userName' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex items-center gap-1">User {sortField === 'userName' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                      </th>
                      <th className="px-6 py-3 font-medium cursor-pointer hover:bg-black/10" onClick={() => { setSortField('roomName'); setSortDirection(sortField === 'roomName' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex items-center gap-1">Room {sortField === 'roomName' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                      </th>
                      <th className="px-6 py-3 font-medium cursor-pointer hover:bg-black/10" onClick={() => { setSortField('date'); setSortDirection(sortField === 'date' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex items-center gap-1">Date {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                      </th>
                      <th className="px-6 py-3 font-medium cursor-pointer hover:bg-black/10" onClick={() => { setSortField('status'); setSortDirection(sortField === 'status' && sortDirection === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex items-center gap-1">Status {sortField === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                      </th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    <AnimatePresence>
                      {paginatedBookings.map(booking => {
                        const isExpanded = expandedRows.has(booking.id);
                        return (
                          <React.Fragment key={booking.id}>
                            <motion.tr 
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => toggleRow(booking.id)}
                              className="hover:bg-black/5 transition-colors group cursor-pointer"
                            >
                              <td className="px-6 py-4 text-black/40">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </td>
                              <td className="px-6 py-4 font-medium">{booking.userName || booking.userId}</td>
                              <td className="px-6 py-4">{rooms[booking.roomId]?.name || booking.roomId}</td>
                              <td className="px-6 py-4">{format(parseISO(booking.date), 'MMM d, yyyy')}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                  booking.status === 'confirmed' ? "bg-black text-white" : "bg-black/10 text-black/60"
                                )}>
                                  {booking.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {booking.status === 'confirmed' && (
                                  <button
                                    onClick={(e) => handleCancelClick(booking, e)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors text-xs font-medium opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                            {isExpanded && (
                              <tr className="bg-black/5 border-b border-black/10">
                                <td colSpan={6} className="px-6 py-4">
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs"
                                  >
                                    <div>
                                      <span className="text-black/50 block mb-1">Booking ID</span>
                                      <span className="font-mono">{booking.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-black/50 block mb-1">User ID</span>
                                      <span className="font-mono">{booking.userId}</span>
                                    </div>
                                    <div>
                                      <span className="text-black/50 block mb-1">Created At</span>
                                      <span>{format(parseISO(booking.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
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
        </motion.div>
      )}

      {activeTab === 'calendar' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-xl">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-md hover:bg-black/5 border border-black/10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 rounded-md hover:bg-black/5 border border-black/10 text-sm font-medium">
                Today
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-md hover:bg-black/5 border border-black/10">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-black/10 rounded-lg overflow-hidden border border-black/10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-black/5 p-2 text-center text-xs font-medium text-black/60 uppercase">
                {day}
              </div>
            ))}
            
            {(() => {
              const start = startOfMonth(currentMonth);
              const end = endOfMonth(currentMonth);
              const days = eachDayOfInterval({ start, end });
              
              // Add padding for first day
              const startDay = start.getDay();
              const padding = Array.from({ length: startDay }).map((_, i) => (
                <div key={`pad-${i}`} className="bg-white min-h-[100px] p-2 opacity-50" />
              ));
              
              const dayCells = days.map(day => {
                const dayBookings = bookings.filter(b => b.date === format(day, 'yyyy-MM-dd'));
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div key={day.toISOString()} className={cn("bg-white min-h-[100px] p-2 border-t border-black/5", !isSameMonth(day, currentMonth) && "opacity-50")}>
                    <div className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1", isToday && "bg-black text-white")}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                        {dayBookings.slice(0, 3).map(b => (
                          <div key={b.id} className={cn("text-[10px] px-1.5 py-0.5 rounded truncate", b.status === 'confirmed' ? "bg-black/10 text-black" : "bg-red-50 text-red-600 line-through")}>
                            {rooms[b.roomId]?.name?.split(' ')[0] || 'Unknown'} - {b.userName?.split(' ')[0] || 'User'}
                          </div>
                        ))}
                      {dayBookings.length > 3 && (
                        <div className="text-[10px] text-black/50 px-1.5">+{dayBookings.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              });
              
              // Add padding for last day
              const endDay = end.getDay();
              const endPadding = Array.from({ length: 6 - endDay }).map((_, i) => (
                <div key={`end-pad-${i}`} className="bg-white min-h-[100px] p-2 opacity-50" />
              ));
              
              return [...padding, ...dayCells, ...endPadding];
            })()}
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-black/10 bg-black/5 flex justify-between items-center">
            <h2 className="font-semibold text-lg">User Management</h2>
            <button className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-black/90 transition-colors">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-black/60 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-black/5 transition-colors group">
                    <td className="px-6 py-4 font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-black/60">{u.email}</td>
                    <td className="px-6 py-4">
                      {editingUserId === u.id ? (
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            try {
                              await fetch(`/api/users/${u.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: u.name, email: u.email, role: newRole })
                              });
                            } catch (err) {
                              console.error('Failed to update role', err);
                            }
                            setEditingUserId(null);
                          }}
                          onBlur={() => setEditingUserId(null)}
                          className="px-2 py-1 rounded border border-black/20 text-xs font-medium bg-white"
                          autoFocus
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80",
                          u.role === 'admin' ? "bg-black text-white" : "bg-black/10 text-black/60"
                        )}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="p-1.5 text-black/60 hover:text-black hover:bg-black/5 rounded-md transition-colors"
                          onClick={() => setEditingUserId(editingUserId === u.id ? null : u.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          onClick={async () => {
                            if (confirm('Delete this user?')) {
                              await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Cancellation Modal */}
      <AnimatePresence>
        {cancelModalOpen && bookingToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => !isCancelling && setCancelModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Cancel Booking?</h3>
                <p className="text-black/60 text-sm mb-6">
                  Are you sure you want to cancel the reservation for <span className="font-medium text-black">{bookingToCancel.userName || bookingToCancel.userId}</span> in <span className="font-medium text-black">{rooms[bookingToCancel.roomId]?.name}</span> on <span className="font-medium text-black">{format(parseISO(bookingToCancel.date), 'MMM d, yyyy')}</span>? This action cannot be undone.
                </p>
                
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setCancelModalOpen(false)}
                    disabled={isCancelling}
                    className="px-4 py-2 rounded-lg font-medium hover:bg-black/5 transition-colors disabled:opacity-50"
                  >
                    Keep Booking
                  </button>
                  <button 
                    onClick={confirmCancellation}
                    disabled={isCancelling}
                    className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
