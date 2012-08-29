
var FacebookClient 		= require("facebook-client").FacebookClient;
var oauth 						= require('oauth');
var xmpp 						  = require('node-xmpp');
var querystring 			= require('querystring');

module.exports = FacebookChat;

/*
	@param consumer_key 		{String} - Facebook's API ConsumerKey
	@param consumer_secret 	{String} - Facebook's API ConsumerSecret
*/
function FacebookChat(consumer_key, consumer_secret){
		
	if(!consumer_key || !consumer_secret) throw 'Argument Execption';
	
	this.consumer_key = consumer_key;
	this.consumer_secret = consumer_secret;
	
	this.client = function() {
		return new FacebookClient(consumer_key, consumer_secret);
	}
	
	this.api = function (path, params, method, callback) {
		
		if(arguments.length < 4){
			callback = method;
			method = 'GET';
		}
		
		if(typeof callback != 'function') throw 'Invalid Argument';
		this.client().graphCall( path, params, method)(function(result) {
	      result = result || { error: 'Unexpected Error' };
				if(result.error) return callback(result.error, null);
				return callback(null, result);
	  });
	}
	
	this.oAuth = function  () {
	 return new oauth.OAuth2(consumer_key, consumer_secret, 'https://graph.facebook.com');
	} 
	
	this.oAuthRedirectUrl = function(redirect_uri, additional_scope) {
		
		redirect_uri = encodeURI(redirect_uri);
		state = redirect_uri;
		scope = ['xmpp_login'];
		if(additional_scope instanceof Array){
		  scope.push.apply(scope, additional_scope)
		}
		
		var reditectUrl = 'https://www.facebook.com/dialog/oauth?'+ querystring.stringify({
				client_id : 	 consumer_key, 
				redirect_uri : redirect_uri,
				scope	: 	scope.join(),
				state : 	state
			});
			
		return reditectUrl;
	}

  this.oAuthGetAccessToken = function(params, callback) {

  	var code = params.code;
  	var redirect_uri = params.state;
  	callback = callback || function(){}
    
  	this.oAuth().getOAuthAccessToken(code,{ redirect_uri: redirect_uri },
  	function(err, access_token, refresh_token){
  	  if (err) return callback(err,null);
  		return callback(null, access_token, refresh_token);
  	})
  }
}

/*
	getUser - Get user of the access_token

	@param authToken 	{String} - search words
	@param params 		{Object, optional}
	@param callback { Function(err, User)... }
*/
FacebookChat.prototype.getUser = function(access_token, params, callback)
{
	if(arguments.length < 3){
		callback = params;
		params = {};
	}
	
	callback = callback || function(){} ;
	params.access_token = access_token;
	this.api('/me', params, callback);
}

/*
	getChatClient - Create ChatClient from access_token

	@param authToken 	{String} - search words
	@param params 		{Object, optional}
	@param callback { Function(err, User)... }
*/
FacebookChat.prototype.getChatClient = function(access_token, callback)
{
  var consumer_key = this.consumer_key;
  callback = callback || function(){};
  
  this.getUser(access_token, function(err, user) {
    
    if(err) return callback(err, null)
    
    var client = new xmpp.Client({
        jid: '-' + user.id + '@chat.facebook.com', 
        api_key: consumer_key,
        access_token: access_token, 
        host: 'chat.facebook.com',
    });
    
    return callback(null, client);
  })
	
	
}






