# ConnectIO

A powerful, real-time video conferencing application built with the **MERN stack** (minus Mongo for now), utilizing **WebRTC**, **Socket.IO**, and **PeerJS** for seamless communication.

This project demonstrates advanced full-stack development skills including real-time data streaming, event-driven architecture, and secure authentication.

## Live Demo

🔗 **ConnectIO (Production Deployment):**  
https://connectio-lmvg.onrender.com

> Note: The app may take up to 30–50 seconds to load on first visit due to free-tier server sleep.


## Features

-   **Video & Audio Conferencing**: High-quality, low-latency multi-user calls using WebRTC mesh networking.
-   **Secure Authentication**: Integrated **Google OAuth 2.0** for secure user login and identity management.
-   **Real-time Chat**: Instant messaging within meeting rooms using Socket.io.
-   **Collaborative Whiteboard**: Real-time synchronized drawing board for remote collaboration.
-   **Meeting Scheduler**: Schedule meetings and automatically send email invitations via **Nodemailer**.
-   **Screen Sharing**: Share your screen with all participants in real-time.
-   **Email Invites**: Send direct meeting invitations with one click.
-   **Responsive Design**: Optimized for different screen sizes using Bootstrap and custom CSS.

##  Deployment

ConnectIO is deployed on **Render** with full production configuration:

-  **Google OAuth 2.0** authentication
-  **HTTPS-secured** sessions
-  **Socket.IO** for real-time signaling & chat
-  **WebRTC (PeerJS)** for audio/video streaming
-  **Nodemailer** for email invitations
-  Reverse proxy handling for production OAuth compatibility

**Hosting Platform:** Render  
**Server:** Node.js + Express  
**Auth Provider:** Google OAuth 2.0


## Tech Stack


-   **Frontend**: HTML5, CSS3 (Modular Architecture), JavaScript (ES6+), EJS Templates, Bootstrap 4
-   **Backend**: Node.js, Express.js
-   **Real-time**: Socket.IO (Signaling & Chat), PeerJS (WebRTC wrapper)
-   **Auth**: Passport.js (Google Strategy)
-   **Tools**: Nodemailer (Email), Node-Cron (Scheduling)

## Prerequisites

Before you begin, ensure you have the following installed:
-[Node.js](https://nodejs.org/) (v14+)
-[npm](https://www.npmjs.com/)

## Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/sharmishta173/ConnectIO-main.git
    cd ConnectIO
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory. You can use `.env.example` as a template.
    ```bash
    cp .env.example .env
    ```
    
    Update `.env` with your credentials:
    ```env
    PORT=3030
    SESSION_SECRET=your_secure_random_string
    
    # Google OAuth (Required for Login)
    # Console: https://console.cloud.google.com/apis/credentials
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    
    # Email (Required for Invites)
    # For Gmail, use an App Password: https://myaccount.google.com/apppasswords
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASSWORD=your_app_password
    ```

4.  **Start the application**
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3030`.

## Usage Guide

1.  **Login**: Sign in using your Google account.
2.  **Dashboard**:
    *   Click **"New Meeting"** to generate a unique room ID and join immediately.
    *   Enter an existing Meeting ID to join a colleague's room.
3.  **In-Meeting Controls**:
    *   **Mute/Stop Video**: Toggle controls at the bottom.
    *   **Chat**: Open the side panel to message participants.
    *   **Whiteboard**: Click the whiteboard icon to open a shared drawing canvas.
    *   **Schedule**: Open the scheduler to set up future meetings.
    *   **Invite**: Send email invites or copy the room link.
4.  **Leaving**: Click "Leave Meeting" to safely disconnect and return to the dashboard.

## Troubleshooting

*   **Google Login Error**: Ensure your "Authorized redirect URIs" in Google Cloud Console includes     `http://localhost:3030/auth/google/callback`.
*   **Email Fails**: Ensure you are using an **App Password** for Gmail, not your login password.
*   **Camera/Mic Not Working**: Check browser permissions. Note that some browsers block media devices on non-HTTPS sites (except localhost).

## License

This project is open source and available under the [MIT License](LICENSE).
