import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';

const rooms = [
  { 
    id: '1', 
    name: 'Executive Suite', 
    capacity: 2, 
    price: 250, 
    image: 'https://www.hoteltentrem.com/yogyakarta/wp-content/uploads/sites/2/2025/01/Executive-Suite-1-1366x768.jpg?auto=format&fit=crop&w=1000&q=80',
    description: 'Spacious suite with city views, king bed, and premium amenities.'
  },
  { 
    id: '2', 
    name: 'Standard Room', 
    capacity: 2, 
    price: 100, 
    image: 'https://res.cloudinary.com/maistra/image/upload/w_1920,c_lfill,g_auto,q_auto,dpr_auto/f_auto/v1700658053/Proprietes/Select/Zagreb/Hotel%20International/22.11.23/23074-09-18%20Hotel%20International%20Rooms/23074-09-18%20Hotel%20International%20Rooms%20Standard%20Single%20Use/Webres%202000px/23074-09-18_Hotel_International_Rooms_Classic_Queen_1_2000px_sivgq2.jpg?auto=format&fit=crop&w=1000&q=80',
    description: 'Comfortable room with queen bed and essential amenities.'
  },
  { 
    id: '3', 
    name: 'Conference Room', 
    capacity: 10, 
    price: 500, 
    image: 'https://www.wework.com/ideas/wp-content/uploads/sites/4/2021/08/20201008-199WaterSt-2_fb.jpg?fit=1200%2C675?auto=format&fit=crop&w=1000&q=80',
    description: 'Large conference room with projector, whiteboard, and seating for 10.'
  },
  { 
    id: '4', 
    name: 'Studio Apartment', 
    capacity: 2, 
    price: 150, 
    image: 'https://cdn.prod.website-files.com/65c18a9a4d6c9699ac22d7bd/678ef8cb0b40ffc5fed6efaa_julias-apartment-11.webp?auto=format&fit=crop&w=1000&q=80',
    description: 'Modern studio with kitchenette and cozy living area.'
  },
  { 
    id: '5', 
    name: 'Family Suite', 
    capacity: 4, 
    price: 300, 
    image: 'https://hotelnikkobali-benoabeach.com/wp-content/uploads/2020/08/heroOVS-Premier-Family_Hotel-Nikko-Bali-2.jpg?auto=format&fit=crop&w=1000&q=80',
    description: 'Two interconnected rooms perfect for family stays.'
  },
  { 
    id: '6', 
    name: 'Penthouse', 
    capacity: 6, 
    price: 800, 
    image: 'https://limassolblumarine.com/wp-content/uploads/2022/11/24-102-Blue-Marine-penthouse-c02b-1-scaled.jpg?auto=format&fit=crop&w=1000&q=80',
    description: 'Luxury penthouse with panoramic views and private terrace.'
  },
  { 
    id: '7', 
    name: 'Cozy Single', 
    capacity: 1, 
    price: 80, 
    image: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/600247040.jpg?k=135a2bbf61b568bf175cc8e5b3a7c71412d2664a059cc4c760e4c3fdf8b6aee2&o=?auto=format&fit=crop&w=1000&q=80',
    description: 'Compact and efficient room for solo travelers.'
  },
  { 
    id: '8', 
    name: 'Meeting Room B', 
    capacity: 8, 
    price: 400, 
    image: 'https://www.studioforma.ca/wp-content/uploads/2024/12/0-6.webp?auto=format&fit=crop&w=1000&q=80',
    description: 'Professional meeting space with video conferencing setup.'
  },
];

let bookings: any[] = [];
let users: any[] = [
  { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' },
  { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'user' }
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  app.use(express.json());
  const PORT = 3000;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API Routes
  app.get('/api/rooms', (req, res) => {
    res.json(rooms);
  });

  app.get('/api/bookings', (req, res) => {
    res.json(bookings);
  });

  app.put('/api/bookings/:id/cancel', (req, res) => {
    const { id } = req.params;
    const booking = bookings.find(b => b.id === id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    booking.status = 'cancelled';
    io.emit('booking:updated', booking);
    res.json(booking);
  });

  app.post('/api/bookings', (req, res) => {
    const { roomId, userId, date, userName } = req.body;
    
    // Check if room is already booked for this date
    const existing = bookings.find(b => b.roomId === roomId && b.date === date && b.status === 'confirmed');
    if (existing) {
      return res.status(400).json({ error: 'Room already booked for this date.' });
    }

    const booking = { 
      id: Date.now().toString(), 
      roomId, 
      userId, 
      userName,
      date,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    io.emit('booking:created', booking);
    res.json(booking);
  });

  // User Management Routes
  app.get('/api/users', (req, res) => {
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { name, email, role } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    const newUser = { id: 'user-' + Date.now(), name, email, role: role || 'user' };
    users.push(newUser);
    io.emit('user:created', newUser);
    res.json(newUser);
  });

  app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    users[userIndex] = { ...users[userIndex], name, email, role };
    io.emit('user:updated', users[userIndex]);
    res.json(users[userIndex]);
  });

  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    users = users.filter(u => u.id !== id);
    io.emit('user:deleted', id);
    res.json({ success: true });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    let user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ 
      token: 'mock-jwt-token-' + Date.now(), 
      user 
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const newUser = { id: 'user-' + Date.now(), name, email, role: 'user' };
    users.push(newUser);
    io.emit('user:created', newUser);

    res.json({ 
      token: 'mock-jwt-token-' + Date.now(), 
      user: newUser 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
