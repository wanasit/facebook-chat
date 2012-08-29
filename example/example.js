
/*

  This example is showing how to use this module to connect with facebook chat
  
  The example will create website that allow user to:
  - login with facebook through oauht (and express.js)
  - listen to facebook chat via Socket IO

  require - express (http://expressjs.com)
          - socket.io (http://socket.io)
*/

var util = require('util');
var url  = require('url');
var xmpp = require('node-xmpp');
var express  = require('express');

var FacebookChat = require('../facebook-chat');
var config = require('./config');

//Http Server
var app = express();
app.use(express.cookieParser());
app.use("/static", express.static(__dirname + '/static'));
app.listen(8085);

//Create OAuth Instance
var facebook_chat = new FacebookChat(
  config.consumer_key, 
  config.consumer_secret);

app.all('/authentication', function(req, res){
	
	if(!req.query.code){
	  console.log('Redirect the user to Authentication From')
	  var redirecUrl = facebook_chat.oAuthRedirectUrl('http://localhost:8085/authentication')
  	res.redirect(redirecUrl);
  	
	}else{
	  console.log('Get access_token from the code')
	  facebook_chat.oAuthGetAccessToken(req.query, function(err, access_token, refresh_token) {
	    
  		if(err) return res.send(500,err);
  	  return res.redirect('/?access_token='+access_token);
  	});
	}
});

app.all('/', function(req, res){
	
	if(!req.query.access_token){
	  return res.redirect('/authentication');
	}else{
	  return res.redirect('/static/index.html?access_token='+req.query.access_token);
	}
});


var io = require('socket.io').listen(8086);
io.sockets.on('connection', function (socket) {
  
  socket.emit('welcome', 'hello world');
  
  socket.on('connect', function (access_token) {  
    
    console.log('SocketIO connect with acess_token :'+access_token);
    
    facebook_chat.getChatClient(access_token,function(err, client){
      
      if(err) return socket.emit('error', err); 
      if(socket.client) socket.client.end();
      socket.client = client;
      
      socket.client.on('online',function() {
        return socket.emit('connected', 'CONNECTED'); 
      })
      
      socket.client.on('stanza', function(stanza) {
        
        if (stanza.is('message') && stanza.children[1]){
          var from = stanza.attrs.from;
          var to = stanza.attrs.to;
          var body = stanza.children[1].children[0];
          
          socket.emit('message', {from:from, to:to, body:body})
        } 
      });
    });
  });
  
  socket.on('send', function(message){
    
    if(socket.client){
      socket.client.send(new xmpp.Element('message',
               { to: message.to,
                 type: 'chat'
               }).c('body').t(message.body));
    }
  })
  
  
  socket.on('disconnect', function () {
    
    console.log('SocketIO disconnect...');
    
    if(socket.client) socket.client.end();
    socket.client = null;
  });
});



