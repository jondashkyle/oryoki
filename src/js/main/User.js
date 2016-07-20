function User(name, factory) {

	this.name = name;
	this.factory = factory;
	this.paths = {};

	// Storing in ~/Library/Application Support/Oryoki | Electron

	this.paths.conf = app.getPath('appData') + '/' + app.getName();
	// Check
	try {
		fs.statSync(this.paths.conf);
	}
	catch(err) {
		if(err.code === 'ENOENT') {
			// @if NODE_ENV='development'
			c.log('[User] Creating App Data directory')
			// @endif
			fs.mkdirSync(this.paths.conf);
		}
		else {
			throw err;
		}
	}

	this.preferences = undefined;
	this.bookmarks = undefined;
	this.history = undefined;

	this.getPreferences();

	this.paths.tmp = this.paths.conf + '/' + 'Temporary';
	// Check
	try {
		fs.statSync(this.paths.tmp);
	}
	catch(err) {
		if(err.code === 'ENOENT') {
			// @if NODE_ENV='development'
			c.log('[User] Creating tmp directory');
			// @endif
			fs.mkdirSync(this.paths.tmp);
		}
		else {
			throw err;
		}
	}

	fs.watchFile(this.paths.conf + '/' + 'oryoki-preferences.json', this.onPreferencesChange.bind(this));
	this.onPreferencesChange();

}

User.prototype.onPreferencesChange = function() {

	this.getPreferences();
	
	if(this.getPreferenceByName('web_plugins_path') != "") {
		// Path is set
		this.paths.webPlugins = this.getPreferenceByName('web_plugins_path');
	}
	else {
		this.paths.webPlugins = this.paths.conf + '/' + 'Web Plugins';
	}

	// Check
	try {
		fs.statSync(this.paths.webPlugins);
	}
	catch(err) {
		if(err.code === 'ENOENT') {
			// @if NODE_ENV='development'
			c.log('[User] Creating web plugins directory');
			// @endif
			fs.mkdirSync(this.paths.webPlugins);
		}
		else {
			throw err;
		}
	}

}

User.prototype.getPreferences = function() {

	this.preferences = this.getConfFile('oryoki-preferences.json', this.createPreferences.bind(this));

}

User.prototype.getConfFile = function(fileName, callback) {

	// @if NODE_ENV='development'
	c.log('[User] Getting conf file: ' + fileName);
	// @endif

	try {

		// Check if conf file exists
		fs.statSync(this.paths.conf + '/' + fileName);	

	}
	catch(err) {

		if(err.code === 'ENOENT') {
			// If not, create file
			callback();
		}
		else {
			throw err;
		}
	}
	finally {

		// Erase comments to validate JSON
		var raw = fs.readFileSync(this.paths.conf + '/' + fileName, 'utf8');
		var re = /\/\/.*/g; // Any line that starts with `//`
		var stripped = raw.replace(re, '');

		return JSON.parse(stripped);

	}

}

User.prototype.createPreferences = function() {

	fs.writeFileSync(this.paths.conf + '/' + 'oryoki-preferences.json', JSON.stringify(this.factory.preferences, null, 4), 'utf8', (err) => {
		if (err) throw err;
	});

}

User.prototype.getPreferenceByName = function(name) {
	/* 
	Checks user for preference
	If not defined, falls back to factory setting.
	*/
	if(this.preferences[name] !== undefined) {
		return this.preferences[name];
	}
	else {
		return this.factory.preferences[name];
	}
}