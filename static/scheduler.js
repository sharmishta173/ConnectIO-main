const socket = io('/');
const submit = document.querySelector('#submit');
submit.addEventListener("click" , dostuff);
function dostuff(e) {
    e.preventDefault();
    console.log(' ');
    const to = document.querySelector("#to").value;
    const subject = document.querySelector("#subject").value;
    const time = document.querySelector("#time").value;
    console.log(to , subject , time);
    socket.emit('sendmail', to , subject , time , id, senderName);
}

socket.on('email-success', (msg) => {
    alert(msg);
    // Optional: close window after success if desired, or just clear form
    document.querySelector("form").reset();
});

socket.on('email-error', (msg) => {
    alert("Error: " + msg);
});