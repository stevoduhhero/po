client.players = new Object();
client.rooms = new Object();
client.channels = new Object();
client.focusedRoom = false;
client.registry = {
	descriptions: {}
};
client.updatePlayer = function(id) {
	var user = client.players[id],
		els = $('#u' + id);
	var status = ((user.battles) ? "b" : ((user.away) ? "w" : "a")) + user.auth;
	els.html(clean(user.name)).attr('class', status).css('color', client.color(id));
};
client.addChannel = function(id, data) {
	client.rooms[id] = data;
	if ($("#c" + id).length) return;
	$("#channels").append('<div id="c' + id + '">' + data + '</div>');
};
client.removeChannel = function(id) {
	$("#c" + id).remove();
	delete client.rooms[id];
};
client.focusRoom = function() {
	var nextRoom = client.channels[Object.keys(client.channels)[0]];
	if (!nextRoom) return;
	nextRoom.focusRoom();
};
client.updateRooms = function() {
	var buff = '';
	for (var id in client.channels) {
		var add = '';
		if (client.channels[id] === client.focusedRoom) add = ' selectedRoom';
		buff += '<div id="' + id + '" class="room' + add + '">' + client.channels[id].name + ' <span class="exitRoom" onclick="client.channels[' + id + '].destroy();">x</span></div>';
	}
	$('.rooms').html(buff);
};
client.connectToRelay = function () {
    if (network.isOpen()) {
        network.close();
    }

    var fullIP = "server.pokemon-online.eu:10508";

    console.log("Connecting to relay @ " + fullIP);

    network.open(
        fullIP,
        // open
        function () {
            console.log("Connected to relay.");
        },
        // error
        function (e) {
            console.log("Network error:", e.data);
        },
        // close
        function () {
            console.log("Disconnected from relay.");
        }
    );
};
client.printHtml = function(d) {
	this.print(d);
};
client.print = function(d) {
	if (client.focusedRoom) return client.focusedRoom.print(d);
	$("#console").append('<div>' + d + '</div>');
	$("#console").scrollTop($('#console').prop('scrollHeight'));
};
client.connectToServer = function() {
	var ip = $("#advcon").val();
	if (!ip.trim()) return;
	if (!$("#username").val().trim()) return $("#username").focus();
	if (network.isOpen()) {
		network.command('connect', {ip: ip});
	}
	client.openServer();
	client.selectedServer = true;
	localStorage.setItem("username", $("#username").val());
};
client.updateDescription = function() {
	var server = $(".selectedServer");
	var name = server.find(".server-name").html(),
		ip = server.find(".server-ip").html();
	$("#description").html(client.registry.descriptions[name]);
	$("#advcon").val(ip);
};
client.resize = function() {
	var inputboxes = 52,
		serverdescription = 125;
	$("#registry").height($("body").height() - ($("body").height() * 0.19) - inputboxes - serverdescription);
	if ($("body").width() < 800) {
		$("#registry-container").css({
			"max-width": $("body").width(),
			"margin-left": -($("body").width() / 2) + "px"
		});
	}
	
	if ($("#server").css('display') != 'none') {
		$(".chat-container").height($("body").height() - $(".menu").height() - 24 - 17).width($("body").width() - 10);
		var leftWidth = $(".left-side").width(),
			minimumLeftWidth = 250;
		if (leftWidth < minimumLeftWidth) {
			$(".left-side").width(minimumLeftWidth);
			$(".right-side").width($(".right-side").width() - (minimumLeftWidth - leftWidth));
		}
		$(".list").height($(".chat-container").height() - ($(".tabs #0").offset().top)).width($(".left-side").width() - 20);
		$(".logs").height($(".chat-container").height() - 67 - $(".rooms").height() - $(".rooms").offset().top);
		$(".logs, .message, .buttons, .rooms").width($(".right-side").width() - 10 - 10);
	}
	var ray = $(".logs");
	for (var i in ray) {
		var el = ray[i];
		if (el.id == 'console') continue;
		copy($("#console"), $("#" + el.id));
	}
};
client.init = function() {
	client.resize();
	client.connectToRelay();
	
	var username = localStorage.getItem("username");
	if (username) $("#username").val(username);
	
	$(window).on('resize', client.resize);
	$(document).mouseup(function() {
		$("body").removeClass("unselectable");
		delete client.mousingDown;
	}).on("mousedown", "#registry tr, .list div, .list tr", function(e) {
		$("body").addClass("unselectable");
		var listType = "selectedServer";
		if (client.selectedServer) listType = "selectedOption"; //tab lists
		if ($(this).hasClass("headers")) return;
		$("." + listType).removeClass(listType);
		$(this).addClass(listType);
		if (!client.selectedServer) client.updateDescription();
		client.mousingDown = true;
	}).on("dblclick", "#registry tr, .list div, .list tr", function() {
		if (!client.selectedServer) client.connectToServer(); else {
			//tab lists
			var types = ["players", "battles", "channels"];
			var el = $('.selectedOption'),
				type = types[$(".selectedTab").attr('id')];
			if (type == "channels") {
				network.command('joinchannel', {channel: el.text()});	
			} else if (type == "battles") {
			
			} else if (type == "players") {
			
			}
		}
	}).on("keydown", function(e) {
		var listType = "selectedServer";
		if (client.selectedServer) listType = "selectedOption"; //tab lists
		var selectedOption = $("." + listType);
		if (!$("." + listType).length) return;
		if (e.keyCode == 13) selectedOption.dblclick();
		if (e.keyCode == 38) {
			//up
			if (!selectedOption.prev().length) return;
			selectedOption.prev().addClass(listType);
			selectedOption.removeClass(listType);
		}
		if (e.keyCode == 40) {
			//down
			if (!selectedOption.next().length) return;
			selectedOption.next().addClass(listType);
			selectedOption.removeClass(listType);
		}
		if (!client.selectedServer) client.updateDescription();
	}).on("mouseover", "#registry tr, .list div, .list tr", function() {
		var listType = "selectedServer";
		if (client.selectedServer) listType = "selectedOption"; //tab lists
		if (!client.mousingDown) return;
		if ($(this).hasClass("headers")) return;
		$("." + listType).removeClass(listType);
		$(this).addClass(listType);
		if (!client.selectedServer) client.updateDescription();
		client.mousingDown = true;
	}).on("click", ".tab", function() {
		$(".selectedOption").removeClass("selectedOption");
		$(".selectedTab").removeClass("selectedTab");
		$(".selectedList").removeClass("selectedList");
		$(this).addClass('selectedTab')
		if (this.id == 2) {
			$(".list").css('z-index', -1);
			$("#channels").addClass("selectedList").css('z-index', 1);
		} else {
			$(".list").css('z-index', 0);
			var tabs = ["players", "battles"];
			$(client.focusedRoom["$" + tabs[this.id]]).addClass("selectedList").css('z-index', 1);
		}
	}).on("click", ".room", function() {
		var channel = client.channels[this.id];
		if (!channel) return client.updateRooms();
		channel.focusRoom();
	}).on("keypress", ".message", function(e) {
		if (e.keyCode == 13) $("#sendButton").click();
	}).on("click", "#sendButton", function() {
		var el = $(".message");
		if (!el.val().trim()) return;
		client.focusedRoom.send(el.val());
		el.val("");
	});
};
client.openServer = function() {
	$("#registry-container").hide();
	$("#server").show();
	client.resize();
};
//utilities
function copy(from, to) {
	if (from === to) return;
	to.width(from.width()).height(from.height()).css({
		position: 'absolute',
		left: from.position().left + "px",
		top: from.position().top + "px"
	});
}
function formatMessage(str) {
	return clean(str);
}
function clean(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
client.id = function(name) {
	for (var id in client.players) {
		var player = client.players[id];
		if (player.name.toLowerCase() == name.toLowerCase()) return id;
	}
	return -1;
};
client.color = function(id) {
    var namecolorlist = ['#5811b1', '#399bcd', '#0474bb', '#f8760d', '#a00c9e', '#0d762b', '#5f4c00', '#9a4f6d', '#d0990f', '#1b1390', '#028678', '#0324b1'];
	var color = client.players[id];
	if (color) color = color.color; else color = "#000000";
	if (!color) color = namecolorlist[id % namecolorlist.length];
	return color;
};
client.rank = function(auth) {
	var auths = ["", "+", "+", "+", ""];
	if (auths[auth]) return auths[auth];
	return "";
};
client.auth = function(id) {
	var player = client.players[id];
	if (player) return player.auth;
	return 0;
};
client.timestamp = function() {
    var dt = new Date();

    var hours = dt.getHours();
    var minutes = dt.getMinutes();
    var seconds = dt.getSeconds();

    // the above dt.get...() functions return a single digit
    // so I prepend the zero here when needed
    if (hours < 10) 
     hours = '0' + hours;

    if (minutes < 10) 
     minutes = '0' + minutes;

    if (seconds < 10) 
     seconds = '0' + seconds;

    return "(" + hours + ":" + minutes + ":" + seconds + ")";
};