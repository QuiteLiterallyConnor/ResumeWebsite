# Stage 1: Build Angular and Go
FROM node:22-alpine AS build

# Install Go and Bash in build stage
RUN apk add --no-cache go bash

WORKDIR /app

# Copy Angular project and Go main file
COPY Resume_Website ./Resume_Website
COPY main.go .

# Install Angular CLI globally in container
RUN npm install -g @angular/cli

# Install dependencies for Angular project
WORKDIR /app/Resume_Website
RUN npm install

# Build Angular project
RUN ng build --configuration production

# Build Go binary
WORKDIR /app
RUN go build main.go

# Stage 2: Runtime container
FROM alpine:latest

WORKDIR /app

# Copy binary
COPY --from=build /app/main .

# Copy built Angular output to 'static'
COPY --from=build /app/Resume_Website/dist/Resume_Website/browser ./static

# Expose port for Go app
EXPOSE 8080

# Run Go binary
CMD ["./main"]
