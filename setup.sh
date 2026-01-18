#!/bin/bash

echo "Setting up Typing Book Trainer..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create server/.env file (see server/env.example.txt)"
echo "2. Set up MongoDB (local or Atlas)"
echo "3. Run 'npm run dev' from the root directory"
echo ""

