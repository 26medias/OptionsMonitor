window.ftl.addon('crypto', function() {
	var crypto	= {
		decrypt:	function(raw, key) {
			var json	= CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(raw, key, { format: JsonFormatter }));
			if (!json) {
				return json;
			}
			try {
				return JSON.parse(json);
			} catch(e) {
				ftl.error(e);
				//ftl.log('JSON CONTENT:', json);
			}
		}
	};
	return crypto;
});


var ekg /*Encryption Key Generator*/	= function(uuid, secret) {
	if (uuid.length != secret.length) {
		return false;
	}
	var i;
	var l = uuid.length;
	var output = [];
	for (i=0;i<l;i++) {
		output.push(
		String.fromCharCode((Math.floor((uuid.charCodeAt(i)+secret.charCodeAt(i))/2))));
	}
	return output.join('');
}

/*
                                  _   
  ___ _ __   ___ _ __ _   _ _ __ | |_ 
 / _ \ '_ \ / __| '__| | | | '_ \| __|
|  __/ | | | (__| |  | |_| | |_) | |_ 
 \___|_| |_|\___|_|   \__, | .__/ \__|
                      |___/|_|        
*/
window.ftl.plugin('ajax-before', function(options) {
	/*
	if (options.encrypt!==false) {
		// save a copy
		uuid	= ftl.uuid();
		secret	= ftl.uuid();
		
		options.headers.uuid	= uuid;
		options.headers.secret	= secret;
		
		options.params	= {
			_e:		CryptoJS.AES.encrypt(JSON.stringify(options.params), ekg(uuid, secret), { format: JsonFormatter }).toString()
		}
	}
	*/
	if (options.encrypt!==false) {
		options.params	= {
			_e:		JSON.stringify(options.params)
		}
	}
	return options;
});

/*
     _                            _   
  __| | ___  ___ _ __ _   _ _ __ | |_ 
 / _` |/ _ \/ __| '__| | | | '_ \| __|
| (_| |  __/ (__| |  | |_| | |_) | |_ 
 \__,_|\___|\___|_|   \__, | .__/ \__|
                      |___/|_|        
*/
window.ftl.plugin('ajax-after', function(data, options, status) {
	/*if (data.hasOwnProperty('_e') && options.headers.uuid && options.headers.secret) {
		var raw			= data._e;
		var key			= ekg( options.headers.uuid,  options.headers.secret);

		var json	= CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(raw, key, { format: JsonFormatter }));
		if (!json) {
			return data;
		}
		if (!_.isObject(json)) {
			try {
				json = JSON.parse(json);
			} catch(e) {
				ftl.error(e);
				ftl.log('JSON CONTENT:', json);
			}
		}
		data = json;
	}*/
			
	return data;
});