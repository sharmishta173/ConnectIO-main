const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
let OtherUsername = "";
chat.hidden = true;
myVideo.muted = true;

let myVideoStream;
const peers = {};
let screenStream = null;
let isScreenSharing = false;

window.onload = () => {
    console.log("Window loaded");
    $(document).ready(function() {
        console.log("Document ready, showing modal");
        $("#getCodeModal").modal("show");
    });
};

var peer = new Peer(undefined, {
    path: "/peerjs",
    host: "/",
    port: window.location.port || "3030",
});

peer.on('open', (id) => {
    console.log("PeerJS Connected with ID:", id);
    socket.emit("join-room", roomId, id, myname);
});

peer.on('error', (err) => {
    console.error("PeerJS Error:", err);
});

// Explicitly define getUserMedia for compatibility
function getLocalStream() {
    console.log("Requesting camera access...");
    
    const constraints = {
        video: true,
        audio: true
    };

    // Modern API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
    } 
    // Legacy API Shim
    else {
        console.warn("Using legacy getUserMedia");
        const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!getUserMedia) {
            return Promise.reject(new Error("getUserMedia is not implemented in this browser"));
        }
        return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
        });
    }
}

function sendmessage(text) {
    if (event.key === "Enter" && text.value != "") {
        socket.emit("messagesend", myname + ' : ' + text.value);
        text.value = "";
        main__chat_window.scrollTop = main__chat_window.scrollHeight;
    }
}

function addVideoStream(videoEl, stream, name) {
    videoEl.srcObject = stream;
    videoEl.addEventListener("loadedmetadata", () => {
        videoEl.play();
    });
    const h1 = document.createElement("h1");
    const h1name = document.createTextNode(name);
    h1.appendChild(h1name);
    const videoGrid = document.createElement("div");
    videoGrid.classList.add("video-grid");
    videoGrid.appendChild(h1);
    videoGrids.appendChild(videoGrid);
    videoGrid.append(videoEl);
    RemoveUnusedDivs();
    let totalUsers = document.getElementsByTagName("video").length;
    if (totalUsers > 1) {
        for (let index = 0; index < totalUsers; index++) {
            document.getElementsByTagName("video")[index].style.width =
                100 / totalUsers + "%";
        }
    }
}

function connectToNewUser(userId, streams, myname) {
    const call = peer.call(userId, streams, {
        metadata: { name: myname }
    });
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, myname);
    });
    call.on("close", () => {
        video.remove();
        RemoveUnusedDivs();
    });
    peers[userId] = call;
}

function RemoveUnusedDivs() {
    alldivs = videoGrids.getElementsByTagName("div");
    for (var i = 0; i < alldivs.length; i++) {
        e = alldivs[i].getElementsByTagName("video").length;
        if (e == 0) {
            alldivs[i].remove();
        }
    }
}

getLocalStream()
    .then((stream) => {
        console.log("Stream received successfully");
        myVideoStream = stream;
        addVideoStream(myVideo, stream, myname);

        socket.on("user-connected", (id, username) => {
            console.log("User connected: " + id);
            const streamToShare = isScreenSharing ? screenStream : myVideoStream;
            connectToNewUser(id, streamToShare, username);
            socket.emit("tellName", myname);
        });

        socket.on("user-disconnected", (id) => {
            console.log("User disconnected: " + id);
            if (peers[id]) peers[id].close();
        });
    })
    .catch((err) => {
        console.error("Failed to get local stream:", err);
        alert("Camera Error: " + err.name + " - " + err.message + "\n\nEnsure you are using HTTPS or localhost.");
    });

peer.on("call", (call) => {
    getLocalStream().then((stream) => {
        call.answer(stream); // Answer the call with an A/V stream.
        const video = document.createElement("video");
        
        // Use name from metadata if available, otherwise fallback to global variable or 'Guest'
        let callerName = (call.metadata && call.metadata.name) ? call.metadata.name : (OtherUsername || 'Guest');
        
        call.on("stream", function(remoteStream) {
            addVideoStream(video, remoteStream, callerName);
        });
    }).catch(err => {
        console.log("Failed to get local stream", err);
    });
});

peer.on("open", (id) => {
    if (typeof roomId !== 'undefined') {
        socket.emit("join-room", roomId, id, myname);
    }
});

socket.on("createMessage", (message) => {
    var ul = document.getElementById("messageadd");
    var li = document.createElement("li");
    li.className = "message";
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
});

socket.on("AddName", (username) => {
    OtherUsername = username;
    console.log(username);
});

function cancel() {
    $("#getCodeModal").modal("hide");
}

async function copy() {
    const roomid = document.getElementById("roomid").innerText;
    const meetingURL = window.location.origin + "/join/" + roomid;
    await navigator.clipboard.writeText(meetingURL).then(() => {
        alert('Meeting link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function openWhiteboard() {
    window.open(`/whiteboard/${roomId}`, "_blank");
}

function openScheduler() {
    window.open(`/scheduler/${roomId}`, "_blank");
}

function invitebox() {
    $("#getCodeModal").modal("show");
}

function muteUnmute() {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getAudioTracks()[0].enabled = false;
        document.getElementById("mic").style.color = "red";
    } else {
        document.getElementById("mic").style.color = "white";
        myVideoStream.getAudioTracks()[0].enabled = true;
    }
}

function VideomuteUnmute() {
    const enabled = myVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        myVideoStream.getVideoTracks()[0].enabled = false;
        document.getElementById("video").style.color = "red";
    } else {
        document.getElementById("video").style.color = "white";
        myVideoStream.getVideoTracks()[0].enabled = true;
    }
}

function showchat() {
    if (chat.hidden == false) {
        chat.hidden = true;
    } else {
        chat.hidden = false;
    }
}

function stopsharing() {
  const html = `
  <i class="fas fa-times-circle"></i>
    <span>Stop Sharing</span>
  `
  document.querySelector('.screenshare').innerHTML = html;
}

function sharing() {
  const html = `
  <i class="fas fa-desktop"></i>
  <span>Share Screen</span>
  `
  document.querySelector('.screenshare').innerHTML = html;
}

const screenshare = document.querySelector(".screenshare");
if (screenshare) {
    screenshare.addEventListener('click' , screensharecode);
}

function screensharecode() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen sharing is not supported in this browser or environment (e.g., inside an IDE preview). Please open the app in a full browser like Chrome, Edge, or Firefox.");
      return;
  }

  if (!isScreenSharing) {
    // Start screen sharing
    navigator.mediaDevices.getDisplayMedia({
        video: true
    })
      .then(stream => {
        screenStream = stream;
        isScreenSharing = true;
        
        // Get the video track from the screen stream
        const screenVideoTrack = stream.getVideoTracks()[0];
        
        // Replace video track for all peer connections
        Object.values(peers).forEach(peerConnection => {
          if (peerConnection && peerConnection.peerConnection) {
            const sender = peerConnection.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              sender.replaceTrack(screenVideoTrack).catch(err => {
                console.error('Failed to replace video track:', err);
              });
            }
          }
        });
        
        // Update video element to show screen
        myVideo.srcObject = stream;
        
        // Emit screen sharing notification
        socket.emit('screenshared', peer._id, roomId);
        
        // Update UI
        stopsharing();
        
        // Handle when user stops screen sharing
        screenVideoTrack.onended = () => {
          screensharecode(); // Call again to stop sharing
        };
      })
      .catch(err => {
        console.error('Failed to get screen stream:', err);
        if (err.name === 'NotAllowedError') {
            // User cancelled the prompt, do nothing
            console.log("Screen sharing cancelled by user");
        } else if (err.name === 'NotSupportedError') {
            alert('Screen sharing is not supported in this environment. Try opening http://localhost:3030 in an external browser.');
        } else {
            alert('Failed to share screen: ' + err.message);
        }
      });
  } else {
    // Stop screen sharing and return to camera
    if (screenStream) {
        const tracks = screenStream.getTracks();
        tracks.forEach(track => track.stop());
        screenStream = null;
    }
    isScreenSharing = false;
    
    // Switch back to camera stream
    if (myVideoStream) {
        const videoTrack = myVideoStream.getVideoTracks()[0];
        
        Object.values(peers).forEach(peerConnection => {
            if (peerConnection && peerConnection.peerConnection) {
                const sender = peerConnection.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack).catch(err => {
                        console.error('Failed to revert to camera track:', err);
                    });
                }
            }
        });
        
        myVideo.srcObject = myVideoStream;
    }
    
    sharing();
  }
}

// Invite feature listeners
socket.on('email-success', (msg) => {
    alert(msg);
    $("#getCodeModal").modal("hide");
});

socket.on('email-error', (msg) => {
    alert("Error: " + msg);
});

function sendInvite() {
    const email = document.getElementById("inviteEmail").value;
    if (email) {
        const roomUrl = window.location.href;
        const subject = "Invitation to join ConnectIO Meeting";
        const time = new Date().toLocaleString();
        
        socket.emit('sendmail', email, subject, time, roomUrl, myname);
    } else {
        alert("Please enter an email address.");
    }
}

function leaveRoom(e) {
    if (!confirm("Are you sure you want to leave the meeting?")) {
        e.preventDefault();
        return;
    }
    
    // Stop local video/audio tracks
    if (myVideoStream) {
        myVideoStream.getTracks().forEach(track => track.stop());
    }
    
    // Stop screen sharing if active
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peer) {
        peer.destroy();
    }
    
    // Socket will disconnect automatically on navigation
}
