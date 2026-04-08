# Booking System

A modern, minimalist room booking application built with React, Express, and Socket.IO for real-time updates.

![Booking System](https://cdn.bluent.com/images/3d-bedroom-designs.webp?w=1200&auto=format&fit=crop&q=80)

Hosting on https://minimalbook.onrender.com

## Features

- **Room Browsing** - Browse 8 room types: Executive Suite, Standard Room, Conference Room, Studio Apartment, Family Suite, Penthouse, Cozy Single, and Meeting Room B
- **Search & Filter** - Search rooms by name/description and filter by capacity
- **Date Selection** - Choose from the next 14 days for your booking
- **User Authentication** - Register and login to manage your bookings
- **User Profile** - View and manage your account
- **Admin Dashboard** - Full management system for bookings, calendar view, and user management
- **Real-time Updates** - Instant updates across all connected clients via Socket.IO
- **Export Data** - Export bookings to CSV for reporting

## Tech Stack

- **Frontend**: React 19, React Router DOM, Motion (animations), Tailwind CSS v4
- **Backend**: Express.js, Socket.IO
- **Build Tool**: Vite
- **Runtime**: Node.js

## Prerequisites

- Node.js 18+

## Installation

```bash
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Mode

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # Main layout with navigation
│   ├── MyBookingsModal.tsx  # User's bookings modal
│   └── Captcha.tsx         # CAPTCHA component
├── pages/
│   ├── Home.tsx            # Room listing and booking
│   ├── Login.tsx           # User login
│   ├── Register.tsx        # User registration
│   ├── Profile.tsx         # User profile management
│   └── AdminDashboard.tsx  # Admin management dashboard
├── context/
│   └── AuthContext.tsx     # Authentication context
├── lib/
│   └── utils.ts            # Utility functions
├── App.tsx                 # Main app component
└── main.tsx               # Entry point

server.ts                   # Express server with Socket.IO
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | Get all available rooms |
| GET | `/api/bookings` | Get all bookings |
| POST | `/api/bookings` | Create a new booking |
| PUT | `/api/bookings/:id/cancel` | Cancel a booking |
| GET | `/api/users` | Get all users (admin) |
| POST | `/api/users` | Create a new user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |

## Default Users

The system comes with pre-configured users:

- **Admin**: `admin@example.com` / any password
- **User**: `john@example.com` / any password

## Room Types

| Room | Capacity | Price/Day |
|------|----------|-----------|
| Executive Suite | 2 | $250 |
| Standard Room | 2 | $100 |
| Conference Room | 10 | $500 |
| Studio Apartment | 2 | $150 |
| Family Suite | 4 | $300 |
| Penthouse | 6 | $800 |
| Cozy Single | 1 | $80 |
| Meeting Room B | 8 | $400 |

## License

MIT
