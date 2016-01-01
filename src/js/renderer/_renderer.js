function addClass (el, className) {
	if (el.classList)
	  el.classList.add(className);
	else
	  el.className += ' ' + className;
}

function removeClass (el, className) {
	if (el.classList)
	  el.classList.remove(className);
	else
	  el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
}
'use strict';
var ipcRenderer = require('electron').ipcRenderer;
var fs = require('fs');
var path = require('path');
var browser = undefined;

ipcRenderer.on('ready', function() {
	
	console.log('Ready!');
	browser = new Browser();

})
function Browser(parameters) {
	
	this.omnibox = new Omnibox({
		'mode' : 'url',
	});

	this.handle = new Handle({

	});

	this.view = new View({
		'page' : 'homepage'
	});

	this.attachEvents();
}

Browser.prototype.attachEvents = function() {
	console.log('Attaching events');
	ipcRenderer.on('hideHandle', this.hideHandle.bind(this));
	ipcRenderer.on('showHandle', this.showHandle.bind(this));
	ipcRenderer.on('showOmnibox', this.showOmnibox.bind(this));
	ipcRenderer.on('hideOmnibox', this.hideOmnibox.bind(this));
}

Browser.prototype.hideHandle = function() {
	this.handle.hide();
	this.omnibox.setHigh();
}

Browser.prototype.showHandle = function() {
	this.handle.show();
	this.omnibox.setLow();
}

Browser.prototype.showOmnibox = function() {
	this.omnibox.show();
}

Browser.prototype.hideOmnibox = function() {
	this.omnibox.hide();
}
function View(parameters) {

	this.el = document.querySelectorAll('#view')[0];
	this.htmlData = undefined;
	this.page = parameters.page;

	console.log('View!');

	this.build();
}

View.prototype.build = function() {
	this.htmlData = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'html', this.page + '.html'), 'utf8');
	this.el.innerHTML = this.htmlData;
	this.el.className = this.page;
	// console.log(this.htmlData);
}

View.prototype.load = function() {

}
function Handle(parameters) {

	this.el = document.querySelectorAll('#handle')[0];
	this.htmlData = undefined;

	console.log('Handle');

	this.build();
	this.show();
}

Handle.prototype.build = function() {
	this.htmlData = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'html', 'handle.html'), 'utf8');
	this.el.innerHTML = this.htmlData;
}

Handle.prototype.hide = function() {
	this.el.className = 'hide';
}

Handle.prototype.show = function() {
	this.el.className = 'show';
}
function Omnibox(parameters) {

	this.el = document.querySelectorAll('#omnibox')[0];
	this.htmlData = undefined;
	this.mode = parameters.mode;

	console.log('Omnibox!');

	this.htmlData = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'html', 'omnibox-' + this.mode + '.html'), 'utf8');
	this.el.innerHTML = this.htmlData;
	this.setLow();
	this.show();
}

Omnibox.prototype.show = function() {
	removeClass(this.el, 'hide');
	addClass(this.el, 'show');
	this.focus();
}

Omnibox.prototype.hide = function() {
	removeClass(this.el, 'show');
	addClass(this.el, 'hide');
}

Omnibox.prototype.focus = function() {
	this.el.querySelectorAll('input')[0].focus();
}

Omnibox.prototype.setHigh = function() {
	removeClass(this.el, 'handle');
	addClass(this.el, 'nohandle');
}

Omnibox.prototype.setLow = function() {
	removeClass(this.el, 'nohandle');
	addClass(this.el, 'handle');}