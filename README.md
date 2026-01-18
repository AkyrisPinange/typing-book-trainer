# Typing Book Trainer

A modern typing practice application where users can practice typing while reading books imported from Project Gutenberg. The app features real-time feedback, progress tracking, virtual keyboard highlighting, and cloud sync capabilities.

## Features

- 📚 Import Project Gutenberg .txt files
- ⌨️ Real-time typing practice with visual feedback (green for correct, red for incorrect)
- 📊 Live statistics (WPM, accuracy, errors)
- 💾 Local and cloud progress persistence
- 🎹 Virtual keyboard with next-key highlighting
- 🌓 Light/dark theme toggle
- 👤 User authentication with JWT
- 📱 Responsive, modern UI

## Tech Stack

### Frontend
- React 18 + Vite
- TypeScript
- TailwindCSS
- Zustand (state management)
- React Router
- Lucide React (icons)

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT authentication
- bcrypt for password hashing
- Zod for validation

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

Or manually:

```bash
cd server && npm install
cd ../client && npm install
```

### 2. MongoDB Setup

#### Option A: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string (format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority`)

#### Option B: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/typing-trainer`

#### Using MongoDB Compass

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Open Compass and paste your connection string
3. Connect to view and manage your database

### 3. Environment Variables

#### Server

Create `server/.env` file:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/typing-trainer
# Or for Atlas: mongodb+srv://username:password@cluster.mongodb.net/typing-trainer?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Important:** Change `JWT_SECRET` to a secure random string in production.

#### Client (Optional)

Create `client/.env` file if you need to change the API URL:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Run the Application

#### Development Mode (Both Client and Server)

From the root directory:

```bash
npm run dev
```

This will start:
- Server on `http://localhost:3001`
- Client on `http://localhost:5173`

#### Run Separately

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

### 5. Build for Production

**Server:**
```bash
cd server
npm run build
npm start
```

**Client:**
```bash
cd client
npm run build
# Serve the dist/ folder with a static server
```

## Usage

### 1. Register/Login

- Navigate to the app
- Click "Register" to create an account (or "Login" if you have one)
- Authentication is optional - you can use the app without an account, but progress won't sync to the cloud

### 2. Import a Book

- Click "Upload .txt File" on the home page
- Select a Project Gutenberg .txt file
- The app will automatically:
  - Clean the text (remove Gutenberg headers/footers)
  - Extract metadata (title, author if available)
  - Generate a unique book ID
  - Save to local storage

### 3. Practice Typing

- Click "Continue" on a book or start typing immediately after import
- Click on the text area to focus
- Type the text exactly as shown
- **Visual Feedback:**
  - Green: Correct character
  - Red: Incorrect character (automatically advances)
- **Virtual Keyboard:** Shows the next key to press (including Shift when needed)
- **Statistics:** Real-time WPM, accuracy, and error count

### 4. Progress Tracking

- Progress is automatically saved:
  - **Local:** Always saved to browser localStorage
  - **Cloud:** Synced to MongoDB when logged in (every 5 seconds while typing)
- Progress includes:
  - Current position in the book
  - Total characters typed
  - Accuracy percentage
  - WPM (words per minute)
  - Error count

### 5. Resume Later

- All imported books appear on the home page
- Click "Continue" to resume from where you left off
- Progress syncs between devices when logged in

## Project Structure

```
typing-book-trainer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Auth/      # Login/Register forms
│   │   │   ├── Keyboard/  # Virtual keyboard
│   │   │   ├── Reader/    # Text display component
│   │   │   ├── Stats/     # Statistics panel
│   │   │   └── ui/        # Reusable UI components
│   │   ├── lib/           # Utilities
│   │   │   ├── api.ts     # API client
│   │   │   ├── storage.ts # localStorage helpers
│   │   │   ├── gutenbergCleaner.ts
│   │   │   ├── keyMapping.ts
│   │   │   └── wpm.ts
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand stores
│   │   └── App.tsx
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # Express routes
│   │   ├── middleware/    # Auth middleware
│   │   ├── utils/         # Utilities
│   │   ├── app.ts         # Express app setup
│   │   └── index.ts       # Server entry point
│   └── package.json
└── package.json           # Root package.json
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```

- `POST /api/auth/login` - Login
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```
  Returns: `{ "accessToken": "..." }`

### Progress (Requires Authentication)

- `GET /api/progress` - Get all user's progress
- `GET /api/progress/:bookId` - Get progress for specific book
- `PUT /api/progress/:bookId` - Save/update progress
  ```json
  {
    "title": "Book Title",
    "totalChars": 100000,
    "positionIndex": 5000,
    "stats": {
      "totalTyped": 5000,
      "totalErrors": 50,
      "accuracy": 99,
      "wpm": 60,
      "lastSessionAt": "2024-01-01T00:00:00.000Z"
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```

## Deployment

### Client (Netlify/Vercel)

1. Build the client:
   ```bash
   cd client
   npm run build
   ```

2. Deploy the `dist/` folder to Netlify or Vercel

3. Set environment variable:
   - `VITE_API_URL=https://your-api-url.com/api`

### Server (Render/Railway/Heroku)

1. Set environment variables in your hosting platform:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN` (your frontend URL)
   - `PORT` (usually auto-set by platform)

2. Deploy:
   ```bash
   cd server
   npm run build
   npm start
   ```

### MongoDB Atlas Connection

1. Create a cluster on MongoDB Atlas
2. Get connection string from "Connect" → "Connect your application"
3. Format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>?retryWrites=true&w=majority`
4. Use this as `MONGODB_URI` in your server `.env`

## Troubleshooting

### MongoDB Connection Issues

- Verify your connection string is correct
- Check that your IP is whitelisted (for Atlas)
- Ensure MongoDB service is running (for local)

### CORS Errors

- Verify `CLIENT_ORIGIN` in server `.env` matches your frontend URL
- Check that the server is running

### Book Text Not Loading

- **Important:** Books are stored in `sessionStorage` - if you close the browser tab, you'll need to re-import the book
- This is a limitation of the MVP - the text is not persisted to localStorage to avoid storage limits
- For production, consider storing book text in IndexedDB or fetching from server
- Progress is always saved, so you won't lose your typing position

### Authentication Issues

- Verify JWT_SECRET is set
- Check token expiration (default: 7 days)
- Clear localStorage and re-login if needed

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

