# LHA Backend - Home Automation

A minimal Node.js backend for controlling a sliding gate and two garage doors using Shelly 1 Gen4 devices over MQTT. Built for use with a Flutter mobile app.

## 🔧 What it does

- **Controls 3 devices**: Left garage door, right garage door, and sliding gate
- **MQTT communication**: Sends toggle commands to Shelly 1 Gen4 devices
- **JWT authentication**: Secures API endpoints with token-based auth
- **Rate limiting**: Prevents spam requests (20 global/10 garage per minute)

## 🏠 Hardware Setup

- **Raspberry Pi 3**: Runs the Node.js backend with PM2
- **3x Shelly 1 Gen4**: Controls each door/gate via MQTT
- **Local MQTT broker**: Handles device communication
- **DuckDNS**: Dynamic DNS with SSL certificates for remote access

## 📡 How it works

1. **Flutter app** sends HTTPS requests to the backend
2. **Backend** validates JWT token and rate limits
3. **MQTT message** sent to appropriate Shelly device
4. **Shelly relay** toggles to open/close door or gate

## 🔗 API Endpoints

```http
POST /garage/:side
# side = left | right | gate
Authorization: Bearer <jwt_token>
```

## 📊 MQTT Topics

Each device listens to its own topic:
```
lha/garage/left/rpc   # Left garage door
lha/garage/right/rpc  # Right garage door  
lha/garage/gate/rpc   # Sliding gate
```

## 🌐 Network Setup

- **Local MQTT**: Internal network communication (192.168.1.x)
- **DuckDNS**: Updates IP every 30 minutes via cron job
- **SSL certificates**: Auto-renewed via Let's Encrypt
- **Port 3000**: Backend API accessible remotely via DuckDNS domain

## 📁 Project Structure

```
lha/
├── src/index.js      # Main Express server
├── jwt.js            # Token generator utility
├── package.json      # Dependencies
└── .env              # Configuration
```
