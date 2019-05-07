const Game = require('../custom-classes/game.js');
const mongoose = require('mongoose');
const Prompt = require('./../models/prompts');
const config = require('./../config/default');

require('dotenv').config();
//const env = (process.env.NODE_ENV).toUpperCase();

const dbURL = config.dbURL || process.env['DB_URL_' + env];

mongoose.connect(dbURL, {useNewUrlParser: true});

const util = require('../socket-utils/socket-utils.js');

module.exports = function (io) {

	const currentPrivateRooms = {};
	const min = 3;
	var rounds = 3;

	// a room is of the form
	// code: { Game }

	//io function
	io.on('connection', socket => {

		//create private room and recieve a code
		socket.on('create-private-room', function (msg, cb) {
			cb = cb || function() {};

			console.log(`${socket.id} is creating a room`)
			//generate random number, can abstract this out so upper and lower bound are passed or are in env file
			const rand = Math.floor((Math.random() * 8000) + 7000);

			const game = new Game(rand);
			game.roomName = msg.roomName
			game.addPlayer(socket.id, msg.playerName)
			currentPrivateRooms[rand] = game;

			io.to(socket.id).emit('create-private-room', {
				roomCode: rand,
				roomName: game.roomName
			})
      			cb(null, 'Done');
		});

		//TODO: verify code to join private room
		socket.on("join-private-room", function(msg, cb) {
      console.log(`${socket.id} is joining a room`);
      cb = cb || function() {};
      // msg.code is room code
      // msg.name is players name
      if (msg.code) {
        let roomCode = parseInt(msg.code);
        if (currentPrivateRooms.hasOwnProperty(roomCode)) {
          // if game exists add user
          if (currentPrivateRooms[roomCode].addPlayer(socket.id, msg.name)) {
            socket.broadcast.emit("join-private-room", {
              msg: "success",
              players: Object.values(currentPrivateRooms[roomCode].players).map(p => p.name),
              roomName: currentPrivateRooms[roomCode].roomName
            });
            socket.emit("join-private-room", {
              msg: "success",
              players: Object.values(currentPrivateRooms[roomCode].players).map(p => p.name),
              roomName: currentPrivateRooms[roomCode].roomName
            });
          } else {
            socket.emit("join-private-room", { msg: "room full" });
          }
        }
      } else {
        socket.emit("join-private-room", {
          msg: "code invalid",
        });
      }

      cb(null, "Done");
    });

    socket.on("get-players", (msg, cb=() =>{}) => {
      const {roomCode} = msg;
      if(currentPrivateRooms[roomCode]){
        const names = (currentPrivateRooms[roomCode]).getPlayerNames();
        socket.emit("get-players", {
          players: names
        })
      }
    })
		socket.on('start-game', function(msg, cb) {
			cb = cb || function() {};
			
			// check that the minimum threshold is met
      // msg.code is room code
			if (currentPrivateRooms.hasOwnProperty(msg.code)) {
				//check if the number of players is at least 3
				const num = (currentPrivateRooms[msg.code]).getNumberofPlayers();

				if (num >= min) {
					//get the keys, i.e socket id from all the players in the game
					//put them in an array called players
					const currPlayers = Array.from(new Set(Object.keys(currentPrivateRooms[msg.code].players)));

					//get the number of prompts needed from the database
					//const results = util.getRandomPrompts(num * rounds);
					const results = util.getRandom(num*rounds);
//					const results = util.getPrompts(num, num*rounds);
					console.log('Prompts ', results);

					results.then(prompts => {

							//
							console.log("PROMPTS FROM RESULTS", prompts);
							//create a loop for each round and get the pairs for that round
							for (let i = 0; i < rounds; i++) {
								const r = i + 1;
								const pairs = util.getPairs(currPlayers, r);
								console.log("PAIRS ", currPlayers, pairs);

								const limit = (i * num) + num;
								const start = i* num;
								//let k = 0;
								//console.log("NUM", num);
								//console.log("LIMIT and START", limit, start);
								currentPrivateRooms[msg.code]['round_'+r] = {};
								for (let j = start, k = 0; j < limit; j++, k++) {
									currentPrivateRooms[msg.code]['round_'+r][prompts[j]] = {};
								
									//initialize pairs on this prompt with empty quote									
									
									//assign each pair a prompt
									currentPrivateRooms[msg.code]['round_'+r][prompts[j]][pairs[k][0]] = '';
									currentPrivateRooms[msg.code]['round_'+r][prompts[j]][pairs[k][1]] = '';

									console.log("PROMPT ", prompts[j], currentPrivateRooms[msg.code]['round_'+r][prompts[j]]);

									//also store the prompt in the player object, under prompts
									(currentPrivateRooms[msg.code].players[pairs[k][0]]).addPrompt(prompts[j]);
									(currentPrivateRooms[msg.code].players[pairs[k][1]]).addPrompt(prompts[j]);
								}
							}
							
							//put those assignments in an object in Game

							//for each player, emit their prompts to repesctive client ids

							for (let i = 0; i < currPlayers.length; i++) {
								console.log('here in the for ', i);

								const qs = (currentPrivateRooms[msg.code].players[currPlayers[i]]).getPrompts();
								console.log("SENDING PROMPTS", qs);
								io.to(currPlayers[i]).emit('start-game', { start: 'true', prompts: qs});
							}
					}).catch(err => console.log('ERROR resolving promise ', err));

					//socket.emit('start-game', { start: 'true' }); 
				} else {
					socket.emit('start-game', { start: 'false', prompts: null });
				}
			} else {
				socket.emit('start-game', { start: 'false', prompts: null});	
			}

			cb(null, 'Done');
		});


		//send to the server, room code, question and answer
		socket.on('submit-answer', function(msg, cb) {
				cb = cb || function() {};

				const roomCode = msg.roomCode;
				const prmpt = msg.prmpt;
				const ans = msg.ans;
				const round = 'round_' + msg.round;
	
				if (currentPrivateRooms[roomCode]) {
					if (currentPrivateRooms[roomCode][round]) {
							console.log('Here is the code and round', roomCode, round, currentPrivateRooms[roomCode]);
 
							if (currentPrivateRooms[roomCode][round][prmpt]) {
								currentPrivateRooms[roomCode][round][prmpt][socket.id] = ans;
								io.to(socket.id).emit('submit-answer', 'success');
							} else {
								io.to(socket.id).emit('submit-answer', 'fail1');
							}
					} else {
						io.to(socket.id).emit('submit-answer', 'fail2');
					}
				} else {	
					io.to(socket.id).emit('submit-answer', 'fail3');
				}

			cb(null, 'Done');
		});

		//end game and room code will be removed
		socket.on('game-over', function (msg, cb) {
			cb = cb || function () { };

			if (currentPrivateRooms[msg]) {
				delete currentPrivateRooms[msg];
			}
			socket.emit('game-over', "");
			cb(null, "Done");
		});

		//TODO: return number of quips when game starts
		//TODO: create a public room
		//TODO; join a public room

		//on disconnect,
		socket.on('disconnect', () => {
		});


		socket.on('add-prompt', function(msg, cb) {
			let prompt = msg.prompt;
			console.log(prompt);

			new Prompt({
				question: prompt
			}).save((err, promptt) => {
	if(err) { /*failed to save, server error */
		console.log("error")
	} else { /* saved successfully */
		console.log('success')
	}
});

		});


	});

}
