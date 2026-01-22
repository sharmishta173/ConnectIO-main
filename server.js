console.log("Starting server...");
require('dotenv').config();

const express = require("express");
const app = express();

// ✅ IMPORTANT: Trust Render's HTTPS proxy
app.set("trust proxy", 1);

const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");

console.log("Creating socket.io...");
const io = require("socket.io")(server);

const { ExpressPeerServer } = require("peer");
const url = require("url");
const path = require("path");
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

console.log("Creating peerServer...");
const peerServer = ExpressPeerServer(server, { debug: true });

// ======================
// Middleware
// ======================
app.set("view engine", "ejs");

app.use("/public", express.static(path.join(__dirname, "static")));
app.use(express.static(path.join(__dirname, "static")));
app.use("/peerjs", peerServer);

// ✅ FIXED session config for HTTPS + OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// ======================
// Passport Google OAuth
// ======================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

function isLoggedIn(req, res, next) {
    req.user ? next() : res.redirect('/start');
}

// ======================
// Routes
// ======================
app.get('/start', (req, res) => {
    if (req.user) return res.redirect('/');
    res.redirect('/auth/google');
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/start' }),
    (req, res) => res.redirect('/')
);

app.get("/", isLoggedIn, (req, res) => {
    res.render("index", { user: req.user });
});

app.get("/joinold", isLoggedIn, (req, res) => {
    const meetingId = req.query.meeting_id;
    meetingId ? res.redirect(`/join/${meetingId}`) : res.redirect('/');
});

app.get("/join", isLoggedIn, (req, res) => {
    res.redirect(url.format({
        pathname: `/join/${uuidv4()}`,
        query: req.query,
    }));
});

app.get("/join/:rooms", isLoggedIn, (req, res) => {
    res.render("room", {
        roomid: req.params.rooms,
        Myname: req.user.displayName,
        email: req.user.emails?.[0]?.value || ''
    });
});

app.get('/whiteboard/:rooms', isLoggedIn, (req, res) => {
    res.render("whiteboard", { roomId: req.params.rooms });
});

app.get('/scheduler/:rooms', isLoggedIn, (req, res) => {
    res.render("scheduler", {
        meetid: req.params.rooms,
        user: req.user
    });
});

app.get('/logout', (req, res, next) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/start');
    });
});

// ======================
// Socket.IO
// ======================
io.on("connection", (socket) => {
    console.log(`${socket.id} connected`);

    socket.on("join-room", (roomId, id, myname) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", id, myname);

        socket.on("messagesend", msg => {
            io.to(roomId).emit("createMessage", msg);
        });

        socket.on("tellName", myname => {
            socket.to(roomId).emit("AddName", myname);
        });

        socket.on("screenshared", id => {
            socket.to(roomId).emit("displayscreen", id);
        });

        socket.on("draw", data => {
            socket.to(roomId).emit("ondraw", data);
        });

        socket.on("down", data => {
            socket.to(roomId).emit("ondown", data);
        });

        socket.on("clear-canvas", () => {
            socket.to(roomId).emit("clear-canvas");
        });

        socket.on("disconnect", () => {
            socket.to(roomId).emit("user-disconnected", id);
        });

        // ======================
        // Email (Nodemailer)
        // ======================
        socket.on("sendmail", async (to, subject, time, link, senderName) => {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            const text = `
Hi,

${senderName} invited you to a meeting.

Time: ${time}
Join: ${link}
`;

            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to,
                subject,
                text
            }, err => {
                if (err) socket.emit("email-error", "Email failed");
                else socket.emit("email-success", "Email sent");
            });
        });
    });
});

// ======================
// Server Start
// ======================
const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
