
// Require files
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Listen to port
http.listen(3000, function(){
  console.log('Server up. Listening on *:3000');
});

// Serve index template
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.get('/main.css', function(req, res){
  res.sendFile(__dirname + '/main.css');
});

// Temporary stores
var messages = [];
var users = [];

// Store messages in array
var storeMessage = function(time,name,msg) {
	messages.push({time: time, name: name, message: msg});

	if (messages.length > 10) {
		messages.shift();
	}
}

var userOnline = function(name){
	users.push(name);
}

var d = new Date(); // New date object

// Create timestamp
var timeStamp = function() {
  return d.getHours() + ':' + d.getMinutes();
}

// Connection
io.on('connection', function(client){
	// On join, prompt for nickname and log to console
	client.on('join', function(name){
		client.nickname = name;

		// Set name to anonymous if empty
		if (client.nickname == '') {
			client.nickname = 'anonymous';
		}

		// Add to array of users if not already present
		if (users.indexOf(client.nickname) < 0) {
			userOnline(client.nickname);
		}

		users.forEach(function(user){
			client.emit('isOnline',user);
		})
		
		// Show last 10 messages that are stored on server
		messages.forEach(function(message){
			client.emit('message', {time: message.time, user: message.name, message: message.message});
		});

		// Display when someone joins
		var joined = client.nickname;
		client.broadcast.emit('joined', joined);
		
		client.broadcast.emit('isOnline',joined);
		
		
	});

	// On disconnect, let others know
	client.on('disconnect', function(data){

		client.broadcast.emit('left', client.nickname);
		
		var user = users.indexOf(client.nickname);
		if (user > -1) {
		    users.splice(user, 1);
		}
		console.log(users);

	});

	// Show who is typing
	client.on("typing", function(data) {  
	  
	    client.broadcast.emit("isTyping", {isTyping: data, person: client.nickname});
	    
	});

	// On message, send to server
  	client.on('message', function(msg){
  		
  		if (client.nickname == null) {
  			var nickname = 'anonymous';
  		} else {
  			var nickname = client.nickname;
  		}
  		// Send messages to everyone, and sender
    	client.broadcast.emit('message',{time: timeStamp(), user: nickname, message: msg});

    	client.broadcast.emit('notify', {user: nickname, message: msg});
    	client.emit("message",{time: timeStamp(), user: nickname, message: msg});
    	// Store into array
    	storeMessage(timeStamp(),nickname,msg);
    });

  	// Error reporting
    client.on('error', function(err){
    	console.err(err);
    });
});