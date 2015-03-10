//Copyright (c) 2015 Benjamin Thomas Norrington <ben@norrington.net>

// dummy websocket to fool ShareJS

//IDEA: mock other user editing the document.
//  ... just call _handleOp but with a src and seq number set.

function Dummy(ottypes) {
	this.readyState = 1; //pretend to be open
	//send dummy init message
	this.id = "be419f6b3076fcf46216ed6236464c58";
	this.inited = false;
	this.collections = {};
	this.ottypes = ottypes;
	this.c = '';
	this.d = '';
	this.seq = 1;
	this.pending = []
	this.flush = this._flush.bind(this);
}

Dummy.prototype.send = function(msg) {
	this._handleMessage(msg);
};

Dummy.prototype._flush = function() {
	if (this.pending.length === 0) return;
	var msg = this.pending.shift();
	if (typeof this.onmessage === 'function')
		this.onmessage(JSON.stringify(msg));
	if (this.pending.length > 0) 
	setTimeout(this.flush,0);
}

Dummy.prototype._emit = function(msg) {
	this.pending.push(msg);
	setTimeout(this.flush,0);
};

Dummy.prototype.close = function() {
	this.readyState = 3;
	if (typeof this.onclose !== 'function') return;
	setTimeout(this.onclose, 1);
};

Dummy.prototype.canSendWhileConnecting = true;
Dummy.prototype.canSendJSON = true;

Dummy.prototype._subLast = function() {
	this._emit({
		data: this.collections[this.c][this.d],
		a: "sub",
	});
};

Dummy.prototype._sub = function(msg) {
	this.c = msg.c;
	this.d = msg.d;
	if (!this.collections.hasOwnProperty(this.c)) this.collections[this.c] = {};
	var collection = this.collections[this.c];
	if (!collection.hasOwnProperty[this.d]) collection[this.d] = {v:0};
	this._emit({
		data: collection[this.d],
		a: 'sub',
		c: this.c,
		d: this.d
	});
};

Dummy.prototype._ack = function(opData) {
	this._emit(opData);

	op2 = {};
	for (var k in opData) if (k !== 'c' && k !== 'd')
		op2[k] = opData[k];
	this._emit(op2,2);
	if (opData.src === undefined || opData.src === this.id) this._emit({a:'ack'},3); //only ack if we sent it
};

Dummy.prototype._create = function(opData, create) {
	var ot = this.ottypes[create.type];
	var data = create.data;
	var doc = this.collections[this.c][this.d];

	doc.v = opData.v;
	create.type = doc.type = ot.uri;
	doc.data = ot.deserialize(data);
	doc.docName = this.d;
	//TODO: do we need to set m:{mtime:..., ctime:...}
	opData.create = create;
	this._ack(opData);
};

Dummy.prototype._delete = function(opData, del) {
	var doc = this.collections[this.c][this.d];
	doc.v = opData.v;
	doc.data = null;

	opData.del = del;
	this._ack(opData);
};

Dummy.prototype._submitOp = function(opData) {
	var doc = this.collections[this.c][this.d];
	doc.v = opData.v;
	var ot = this.ottypes[doc.type];
	doc.data = ot.apply(doc.data, opData.op);
	this._ack(opData);
};

Dummy.prototype._handleOp = function(req) {
	var opData = {a:'op', op:req.op, v:req.v, src:req.src, seq:req.seq};

	if (req.c !== undefined) this.c = opData.c = req.c;
	if (req.d !== undefined) this.d = opData.d = req.d;

    // Fill in the src and seq with the client's data if its missing.
    if (!req.src) {
      opData.src = this.id;
      opData.seq = this.seq++;
    }

    if (req.create !== undefined) this._create(opData, req.create);
    else if (req.del !== undefined) this._delete(opData, req.del);
    else this._submitOp(opData);
};

Dummy.prototype._handleMessage = function(msg) {
	if (!this.inited) {
		this.inited = true;
		this._emit({"a":"init","protocol":0,"id":this.id});
	}
	switch (msg.a) {
		case 'sub': return (msg.c === undefined) ? this._subLast(msg) : this._sub(msg);
		case 'op': return this._handleOp(msg);
	}
};

module.exports = Dummy;