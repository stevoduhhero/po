function Channel(id) {
	this.players = new Object();
	this.battles = new Object();
	this.id = id;
	this.name = client.rooms[id];
		
	//add logs
	$('.right-side').append('<div id="r' + id + '" class="logs"></div>');
	this.$logs = $('#r' + id);
	copy($("#console"), this.$logs);
	//add players
	$(".left-side").append('<div id="p' + id + '" class="list"></div>');
	this.$players = $('#p' + id);
	copy($("#channels"), this.$players);
	//add battles
	$(".left-side").append('<div id="b' + id + '" class="list"><table align="center"></table></div>');
	this.$battles = $('#b' + id);
	copy($("#channels"), this.$battles);
	
	this.focusRoom();
	
	client.channels[id] = this;
	client.updateRooms();
}
Channel.prototype.print = function(msg, html, raw) {
	var pref = msg.substr(0, msg.indexOf(":"));
	var id = client.id(pref);
	var auth = client.auth(id);

	//if (client.ignore[id or player]) return;

	if (pref === "~~Server~~") {
		pref = "<span class='server-message'>" + pref + ":</span>";
	} else if (pref === "Welcome Message") {
		pref = "<span class='welcome-message'>" + pref + ":</span>";
	} else if (id === -1) {
		pref = "<span class='script-message'>" + pref + ":</span>";
	} else {
		if (!html) pref = clean(pref);
		pref = "<span style='color: " + client.color(id) + "'>" + client.timestamp() + " <b>" + client.rank(auth) + pref + ":</b>" + "</span>";
	}

	if (!html) msg = formatMessage(msg.slice(msg.indexOf(":") + 1));
	msg = pref + msg;

	var el = $(this.$logs);
	var scrollDown = el.scrollTop() >= el.prop('scrollHeight') - el.prop('offsetHeight');
	el.append('<div>' + msg + '</div>');
	if (scrollDown) el.scrollTop(el.prop('scrollHeight'));	
};
Channel.prototype.updatePlayers = function() {
	for (var i in this.players) this.addPlayer(i, false);
};
Channel.prototype.addPlayer = function(id, e) {
	var el = $(this.$players),
		user = client.players[id];
	el.find('#u' + id).remove();
	el.append('<div id="u' + id + '" style="color: ' + client.color(id) + ';"' + ' class="' + ((user.battles) ? "b" : ((user.away) ? "w" : "a")) + user.auth + '">' + clean(user.name) + '</div>');
	if (e !== false) this.addEvent(clean(user.name) + ' joined the channel.');
};
Channel.prototype.removePlayer = function(id, e) {
	var el = $(this.$players).find('#u' + id);
	if (e !== false) this.addEvent(el.html() + ' left the channel.');
	el.remove();
};
Channel.prototype.updateBattles = function() {
	for (var id in this.battles) this.addBattle(id, false);
};
Channel.prototype.addBattle = function(id, e) {
	var el = $(this.$battles),
		players = this.battles[id];	
	if (el.find('#battle' + id).length) return;
	
	function name(id) {
		var p = client.players[id];
		if (p && p.name) {
			if (p.battles) {
				p.battles++;
			} else {
				p.battles = 1;
				client.updatePlayer(id);
			}
			return clean(p.name);
		}
		return "~Unknown";
	}
	el.find("table").append('<tr id="battle' + id + '"><td><p>' + name(players[0]) + '</p></td><th>VS</th><td><b>' + name(players[1]) + '</b></td></tr>');
	if (e !== false) this.addEvent('Battle started between ' + name(players[0]) + " and " + name(players[1]) + ".");
};
Channel.prototype.removeBattle = function(id, e) {
	var el = $(this.$battles).find('#battle' + id);
	var players = el.find('td');
	if (e !== false) this.addEvent('Battle finished between ' + clean($(players[0]).text()) + " and " + clean($(players[1]).text()) + " finished.");
	el.remove();
};
Channel.prototype.focusRoom = function() {
	//put new / selectedList at front
	$(".selectedList").removeClass("selectedList");
	var els = [this.$players, this.$battles, $("#channels")];
	$(".list").css('z-index', -1);
	var showEl = els[$(".selectedTab").attr("id")].addClass("selectedList").css('z-index', 1);
	//put new logs at front
	$(".selectedLogs").removeClass("selectedLogs");
	this.$logs.addClass("selectedLogs");
	
	client.focusedRoom = this;
	client.updateRooms();
};
Channel.prototype.destroy = function() {
	if (this.id == 0) return false; //shit glitches when removing tohjo falls
	network.command('leavechannel', {channel: this.id});
	$(this.$battles).remove();
	$(this.$logs).remove();
	$(this.$players).remove();
	
	if (!$(".selectedLogs").length) client.focusRoom();
	
	delete client.channels[this.id];
	client.updateRooms();
};
Channel.prototype.addEvent = function(msg) {
	if (client.dontSendEvents) return;
	var el = $(this.$logs);
	var scrollDown = el.scrollTop() >= el.prop('scrollHeight') - el.prop('offsetHeight');
	el.append('<div><small>' + client.timestamp() + " " + msg + '</small></div>');
	if (scrollDown) el.scrollTop(el.prop('scrollHeight'));	
};
Channel.prototype.send = function(msg) {
	var lines = msg.trim().split('\n');
	for (var i in lines) {
		var line = lines[i];
		network.command('chat', {channel: this.id, message: line});
	}
};