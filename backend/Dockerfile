FROM golang:1.25.8-alpine3.23 AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=build /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
