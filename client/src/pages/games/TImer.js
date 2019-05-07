import React from "react";

var time = 90;

var timer = setInterval(function() {
	document.getElementById("countdown").innerHTML = time + " seconds";
	time -= 1;

	if (time <= 0) {
		clearInterval(timer);
		document.getElementById("countdown").innerHTML = "time's up!"
	}
}, 1000);

const timer = () => {
	return(
			<div className="timer">

				<p> Time Left: </p>			

				<Row>

				<Col>

					<button onclick="setTimeout(myFunction, 90000)">timer</button>

					<script>
						function myFunction() {
							alert("time over");
						}
					</script>

				</Col>

				</Row>

			</div>
	)
}

export default timer;

// notes: https://robdodson.me/building-a-countdown-timer-with-socket-dot-io/

// var countdown = 90000;

// timer(function() {
// 	countdown--;

// 	io.sockets.emit("timer", {countdown: countdown});

// }, 5000);

// io.sockets.on("on", function(socket) {
// 	socket.on("reset", function(data) {
// 		countdown = 90000;

// 		io.sockets.emit("timer", {countdown: countdown});
// 	});
// });