console.log("Starting server...");
require('dotenv').config();
const express = require("express");
const app = express();
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
const peerServer = ExpressPeerServer(server, {
    debug: true,
});

// Middleware
app.set("view engine", "ejs");
// Serve static files from 'static' directory mapped to '/public'
app.use("/public", express.static(path.join(__dirname, "static")));
// Also serve static files from 'static' directory at root (for style.css etc in templates)
app.use(express.static(path.join(__dirname, "static")));

app.use("/peerjs", peerServer);

app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Config
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, cb) => {
    return cb(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

function isLoggedIn(req, res, next) {
    req.user ? next() : res.redirect('/start');
}

// Routes
app.get('/start', (req, res) => {
    // If already logged in, go to home
    if (req.user) {
        return res.redirect('/');
    }
    // Initiate Google Login
    res.redirect('/auth/google');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/start' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get("/", isLoggedIn, (req, res) => {
    // Render the index view with user data
    res.render("index", { user: req.user });
});

app.get("/joinold", isLoggedIn, (req, res) => {
    const meetingId = req.query.meeting_id;
    if (meetingId) {
        res.redirect(`/join/${meetingId}`);
    } else {
        res.redirect('/');
    }
});

app.get("/join", isLoggedIn, (req, res) => {
    res.redirect(
        url.format({
            pathname: `/join/${uuidv4()}`,
            query: req.query,
        })
    );
});

app.get("/join/:rooms", isLoggedIn, (req, res) => {
    res.render("room", {
        roomid: req.params.rooms,
        Myname: req.user.displayName, // Use Google profile name
        email: req.user.emails && req.user.emails[0] ? req.user.emails[0].value : ''
    });
});

app.get('/whiteboard/:rooms', isLoggedIn, (req, res) => {
    const roomId = req.params.rooms;
    res.render("whiteboard", { roomId });
});

app.get('/scheduler/:rooms', isLoggedIn, (req, res) => {
    const meetid = req.params.rooms;
    res.render("scheduler", {
        meetid,
        user: req.user // Pass full user object
    });
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/start');
    });
});

// Socket.io
io.on("connection", (socket) => {
    console.log(`${socket.id} has connected`);

    socket.on("join-room", (roomId, id, myname) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", id, myname);

        socket.on("messagesend", (message) => {
            io.to(roomId).emit("createMessage", message);
        });

        socket.on("tellName", (myname) => {
            socket.to(roomId).emit("AddName", myname);
        });

        socket.on('screenshared', (id) => { // Removed redundant roomId param as we are in closure
            socket.to(roomId).emit("displayscreen", id);
        });

        // Whiteboard drawing events
        socket.on('draw', (data) => {
            socket.to(roomId).emit('ondraw', { x: data.x, y: data.y, color: data.color });
        });

        socket.on('down', (data) => {
            socket.to(roomId).emit('ondown', { x: data.x, y: data.y, color: data.color });
        });

        socket.on('clear-canvas', () => {
            socket.to(roomId).emit('clear-canvas');
        });

        socket.on("disconnect", () => {
            socket.to(roomId).emit("user-disconnected", id);
        });

let testAccount = null;

        socket.on("sendmail", async (to, subject, time, id, senderName) => {
            // Validate email input
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!to || !emailRegex.test(to)) {
                console.log('Invalid email address:', to);
                socket.emit('email-error', 'Invalid email address');
                return;
            }

            let emailUser = process.env.EMAIL_USER;
            let emailPassword = process.env.EMAIL_PASSWORD;
            let isTest = false;

            // Check if using default or missing credentials
            if (!emailUser || !emailPassword || emailUser.includes('your-email') || emailPassword.includes('your-app-password')) {
                console.log('Real email config missing. Attempting to use Ethereal test account...');
                
                try {
                    if (!testAccount) {
                        testAccount = await nodemailer.createTestAccount();
                        console.log('Created Ethereal test account:', testAccount.user);
                    }
                    emailUser = testAccount.user;
                    emailPassword = testAccount.pass;
                    isTest = true;
                } catch (err) {
                    console.error('Failed to create test account:', err);
                    socket.emit('email-error', 'Server email not configured and test account failed');
                    return;
                }
            }

            let transporter;
            if (isTest) {
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: emailUser,
                        pass: emailPassword,
                    }
                });
            } else {
                transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: emailUser,
                        pass: emailPassword,
                    }
                });
            }

            let text = `Hi, \n\n${senderName} has invited you to join a meeting.\n\n`;
            text += `Time: ${time}\n`;
            text += `Join Link: ${id}\n`;
            if (isTest) {
                text += `\n[This is a test email sent via Ethereal.email because server credentials are not configured]`;
            }

            var mailOptions = {
                from: isTest ? `"ConnectIO Test" <${emailUser}>` : emailUser,
                to: to,
                subject: isTest ? `[TEST] ${subject}` : subject,
                text: text,
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.error('Email sending failed:', error);
                    socket.emit('email-error', 'Failed to send email');
                } else {
                    console.log('Email sent successfully');
                    if (isTest) {
                        const previewUrl = nodemailer.getTestMessageUrl(info);
                        console.log('Preview URL: ' + previewUrl);
                        socket.emit('email-success', `Test email sent! View it here: ${previewUrl}`);
                        // Also log it clearly so user can see in terminal
                        console.log('\n---------------------------------------------------');
                        console.log('📧 TEST EMAIL SENT! VIEW PREVIEW HERE:');
                        console.log(previewUrl);
                        console.log('---------------------------------------------------\n');
                    } else {
                        socket.emit('email-success', 'Email sent successfully');
                    }
                }
            });

            // Schedule reminder email (15 minutes before meeting)
            try {
                let hour = parseInt(time.substring(0, 2));
                let minute = parseInt(time.substring(3, 5)) - 15;

                // Handle minute underflow
                if (minute < 0) {
                    minute += 60;
                    hour -= 1;
                }

                if (hour < 0) hour = 23;

                const cronTime = `${minute} ${hour} * * *`;
                // Note: This cron job will run every day at that time. 
                // Ideally we should use a date-based scheduler or cancel it after running.
                // For this fix, we'll keep it simple but maybe add a date check if we had date.
                // Since we only have time, it assumes "today" or "daily".
                
                const task = cron.schedule(cronTime, function () {
                    const reminderOptions = {
                        ...mailOptions,
                        subject: "Reminder: " + subject,
                        text: `Reminder: Meeting starts in 15 minutes.\n\n${text}`
                    };
                    transporter.sendMail(reminderOptions, (error, info) => {
                        if (error) console.error('Reminder email failed:', error);
                        else console.log('Reminder email sent');
                        
                        // Stop the task after sending once (assuming one-off meeting for today)
                        task.stop(); 
                    });
                });
            } catch (err) {
                console.error('Error scheduling reminder:', err);
            }
        });
    });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});
