# Stage 1: Build Angular and Go
FROM node:20-alpine AS build

# Install Go
RUN apk add --no-cache go

WORKDIR /app

# Copy build scripts and source code
COPY build.sh .
COPY Resume_Website ./Resume_Website
COPY main.go .
COPY static ./static

# Make build script executable and run it
RUN chmod +x build.sh && ./build.sh

# Stage 2: Runtime container
FROM alpine:latest

WORKDIR /app

# Copy binary and static files from build stage
COPY --from=build /app/main .
COPY --from=build /app/static ./static

# Expose port used by your Go app
EXPOSE 8080

CMD ["./main"]
