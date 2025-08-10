#!/bin/bash
set -e  # Exit on error

# Navigate to Resume_Website directory and build Angular app
cd Resume_Website
ng build --configuration production

# Go back to root
cd ..

# Remove everything inside 'static'
rm -rf static/*
mkdir -p static

# Copy Angular build output into 'static'
cp -r Resume_Website/dist/Resume_Website/browser/* static/

# Build Go application
go build main.go

echo "Build complete."
