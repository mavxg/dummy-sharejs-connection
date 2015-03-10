var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var slate0 = require('slate0');
var sharejs = require('share').client;
sharejs.registerType(slate0.type);

var ottypes = {};
ottypes[slate0.type.name] = ottypes[slate0.type.uri] = slate0.type;

var Dummy = require('../lib/');

var m = slate0.model;

describe('Dummy', function() {
	var base = new m.Document(1,[new m.P(2,["This is some text."])]);
	var dummy = new Dummy(ottypes);
	var sjs = new sharejs.Connection(dummy);
	//sjs.debug = true;

	it('Can create document', function(done) {
		var doc = sjs.get('tests', 'docA');
		var snapshot;
		doc.subscribe();
		doc.whenReady(function() {
			if (!doc.type) doc.create('slate0', base);
			snapshot = doc.getSnapshot();
			assert.equal(JSON.stringify(base), JSON.stringify(snapshot));
			setTimeout(done, 20);
		});
	});

	it('Can fetch existing document', function(done) {
		var doc = sjs.get('tests', 'docA');
		var snapshot;
		doc.subscribe();
		doc.whenReady(function() {
			assert.equal(doc.type, slate0.type);
			snapshot = doc.getSnapshot();
			assert.equal(JSON.stringify(base), JSON.stringify(snapshot));
			setTimeout(done, 20);
		});
	});

	it('Can modify existing document', function(done) {
		var doc = sjs.get('tests', 'docA');
		doc.subscribe();
		var cb = function(op, local) {
			assert.equal('{"type":"Document","id":1,"children":[{"type":"P","id":2,"children":["This really is some text."]}]}', 
				JSON.stringify(doc.getSnapshot()))
			doc.removeListener('after op', cb);
			setTimeout(done, 20);
		}
		doc.on('after op', cb);
		doc.submitOp([6,{i:" really"},20-6]);
		doc.flush();
	});


	it('Other user can modify document', function(done) {
		var doc = sjs.get('tests', 'docA');
		var context = doc.createContext();
		doc.subscribe();
		var cb = function(op, local) {
			assert.isFalse(local);
			assert.equal('{"type":"Document","id":1,"children":[{"type":"P","id":2,"children":["This really is some awesome text."]}]}', 
				JSON.stringify(doc.getSnapshot()))
			doc.removeListener('after op', cb);
			setTimeout(done, 20);
		}
		doc.on('after op', cb);
		dummy._submitOp({a:'op', op:[21,{i:" awesome"},27-21], v:2, seq:3, src:"otheruser"});

		doc.flush();
	});
});