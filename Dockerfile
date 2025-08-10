FROM node:22-alpine AS build

RUN apk add --no-cache go

WORKDIR /app

COPY build.sh .
COPY Resume_Website ./Resume_Website
COPY main.go .
COPY static ./static

RUN chmod +x build.sh && ./node_modules/.bin/ng version || (cd Resume_Website && npm ci && ../node_modules/.bin/ng version) && ./build.sh

FROM alpine:latest
WORKDIR /app
COPY --from=build /app/main .
COPY --from=build /app/static ./static
EXPOSE 8080
CMD ["./main"]
