(function (WebSocket, client, JSON) {
    var states = {
        Connecting: 0,
        Open: 1,
        Closing: 2,
        Closed: 3,
        '0': 'Connecting',
        '1': 'Open',
        '2': 'Closing',
        '3': 'Closed'
    };

    // TODO: Organize this
    var transformers = {
        register: function () {
            return 'register|';
        },
        registry: function () {
            return 'registry';
        },
        // ?
        teamchange: function (payload) {
            return 'teamChange|' + JSON.stringify(payload);
        },
        // battle: number
        watch: function (payload) {
            return 'watch|' + payload.battle;
        },
        // battle: number
        stopwatching: function (payload) {
            return 'stopwatching|' + payload.battle;
        },
        // sameTier: boolean, range: number
        findbattle: function (payload) {
            return 'findbattle|' + JSON.stringify(payload);
        },
        // ?
        battlechoice: function (payload) {
            return 'battlechoice|' + payload.id + '|' + JSON.stringify(payload.choice);
        },
        // battle: number
        forfeit: function (payload) {
            return 'forfeit|' + payload.battle;
        },
        // id: number
        player: function (payload) {
            return 'player|' + payload.id;
        },
        // ip: string
        connect: function (payload) {
            return 'connect|' + payload.ip;
        },
        // channel: string
        joinchannel: function (payload) {
            return 'join|' + payload.channel;
        },
        // channel: number
        leavechannel: function (payload) {
            return 'leave|' + payload.channel;
        },
        // message: string, channel: number
        chat: function (payload) {
            return 'chat|' + JSON.stringify(payload);
        },
        // to: number, message: string
        pm: function (payload) {
            return 'pm|' + JSON.stringify(payload);
        },
        // battle: number, message: string
        battlechat: function (payload) {
            return 'battlechat|' + payload.battle + '|' + payload.message;
        },
        // battle: number, message: string
        spectatingchat: function (payload) {
            return 'spectatingchat|' + payload.battle + '|' + payload.message;
        },
        // version: number, name: string, default: string, autojoin: string, ladder: boolean, idle: boolean, color: string
        login: function (payload) {
            return 'login|' + JSON.stringify(payload);
        },
        // hash: string
        auth: function (payload) {
            return 'auth|' + payload.hash;
        },
        // id: number
        getrankings: function (payload) {
            return 'getrankings|' + payload.id;
        },
        //id: number, tier: string, team: number (of own team slot), clauses: number
        challengeplayer : function(payload) {
            /* Convert clauses as an array to a number */
            var copy = $.extend({}, payload, {"clauses": 0});
            var mult = 1;
            for (var i in payload.clauses) {
                copy.clauses += mult * payload.clauses[i];
                mult *= 2;
            }
            return 'challenge|' + JSON.stringify(copy);
        }
    };

    var events = {
        defaultserver: function (payload) {
            /* If the server is on the same IP as the relay, we display the server IP but
                send localhost */
			function queryField(key, default_,query) {
				var match = new RegExp('[?&]' + key + '=([^&]*)')
					.exec(query || window.location.search);
				return (match && decodeURIComponent(match[1].replace(/\+/g, ' '))) || default_;
			}
            var server = payload.replace("localhost", this.relay),
                qserver = queryField("server");

            $("#advcon").val((qserver && qserver !== "default") ? qserver : server);

            if (queryField("autoconnect") === "true") {
                client.connectToServer();
            } else {
                this.command('registry');
            }
        },
        servers: function (payload) {
            var servers = JSON.parse(payload),
                html = "",
                server, len, i;
			
			html += '<thead><tr class="headers"><th>Server Name</th><th>Players / Max</th><th>Advanced Connection</th></tr></thead>';
            for (i = 0, len = servers.length; i < len; i += 1) {
                server = servers[i];
                html += "<tr><td class='server-name'>" + server.name + "</td><td>" + server.num + ("max" in server ? " / " + server.max : "") + "</td>" + "<td class='server-ip'>" + server.ip + ":" + server.port + "</td></tr>";
                client.registry.descriptions[server.name] = server.description;
            }

            $("#registry").html(html);
            $("#registry").tablesorter({
                sortList: [[1, 1]]
            });
			$(".registry").show();
			$("#description").html("Connected!");
			$("#registry tr")[1].className = "selectedServer";
        },
        connected: function () {
            var net = this;
            client.printHtml("<timestamp/> Connected to server!");

            var username = $("#username").val();
            var data = {version: 1};
            data.ladder = true;
			data.idle = false;
			data.color = "#000000";
			data.name = username;
			this.command('login', data);
            client.connectedToServer = true;
        },
        disconnected: function () {
            client.printHtml("<b>Disconnected from Server! If the disconnect is due to an internet problem, try to <a href='po:reconnect'>reconnect</a> once the issue is solved.</b>");
            client.connectedToServer = false;
            // announcement.hide("slow");
        },
        msg: function (payload) {
            client.print(payload);
        },
        error: function (payload) {
            client.print(payload);
        },
        chat: function (payload) {
            var params = JSON.parse(payload),
                chan = client.channels[params.channel];

            if ((params.channel == -1 && params.message.charAt(0) != "~") || !chan) {
                client.print(params.message, params.html);
            } else {
                chan.print(params.message, params.html);
            }
        },
        challenge: function (payload) {
            var password = $("#password").val(),
                net = this,
                hash;

            if (password) {
                hash = MD5(MD5(password) + payload);
                net.send('auth', {hash: hash});
            } else {
				var pass = prompt('Enter your password:');
				if (pass) {
					hash = MD5(MD5(pass) + payload);
					net.send('auth', {hash: hash});
				} else {
					net.close();
				}
            }
        },
        announcement: function (payload) {
            $(".announcement").html(payload).show();
			client.resize();
        },
        login: function (payload) {
            var params = JSON.parse(payload);
			var obj = {};
			obj[params.id] = params.info;
			client.players[params.id] = params.info;
            this.command('getrankings', {id: params.id});
        },
        tiers: function (payload) {
            window.tiersList = JSON.parse(payload);
        },
		unregistered: function(payload) {
			//make register button work
		},
		channels: function(payload) {
			var channels = JSON.parse(payload);
			for (var id in channels) client.addChannel(id, channels[id]);
		},
		players: function(payload) {
			//join server
			var players = JSON.parse(payload);
			for (var id in players) client.players[id] = players[id];
		},
		channelplayers: function(payload) {
			var data = JSON.parse(payload);
			if (!client.channels[data.channel]) new Channel(data.channel);
			var channel = client.channels[data.channel];
			for (var i in data.players) channel.players[data.players[i]] = 1;
			channel.updatePlayers();
		},
		channelbattlelist: function(payload) {
            var channel = payload.split("|")[0],
                data = JSON.parse(payload.slice(channel.length + 1));
			if (!client.channels[channel]) new Channel(channel);
			var channel = client.channels[channel];
			for (var id in data) channel.battles[id] = data[id].ids;
			channel.updateBattles();
		},
		playerlogout: function(payload) {
			//leave server
			delete client.players[payload];
		},
		leave: function(payload) {
			//leave channel
			var splint = payload.split('|');
			var channel = client.channels[splint[0]];
			if (!channel) return;
			delete channel.players[splint[1]];
			channel.removePlayer(splint[1]);
		},
		join: function(payload) {
			//join channel
			var splint = payload.split('|');
			var channel = client.channels[splint[0]];
			channel.players[splint[1]] = 1;
			channel.addPlayer(splint[1]);
		},
		/*
		channelbattle: function(payload) {
		
		},
		rankings: function(payload) {
			//dunno dont do it
		},
		*/
		battlefinished: function(payload) {
            var id = payload.split("|")[0],
                data = JSON.parse(payload.slice(id.length + 1));
			for (var i in client.channels) {
				var channel = client.channels[i];
				if (!channel.battles[id]) continue;
				var players = channel.battles[id];
				function removeBattle(id) {
					var player = client.players[id];
					if (!player || !player.battles) return;
					client.players[id].battles--;
					player = client.players[id];
					if (player.battles <= 0) {
						delete client.players[id].battles;
						client.updatePlayer(id);
					}
				}
				removeBattle(players[0]);
				removeBattle(players[1]);
				delete channel.battles[id];
				channel.removeBattle(id);
			}
		},
		battlestarted: function(payload) {
            var id = payload.split("|")[0],
                players = JSON.parse(payload.slice(id.length + 1)).ids;
			for (var i in client.channels) {
				var channel = client.channels[i];
				if (!channel.players[players[0]] && !channel.players[players[1]]) continue;
				channel.battles[id] = players;
				channel.addBattle(id);
			}
		},
		newchannel: function(payload) {
			//add to client.rooms
			var data = JSON.parse(payload);
			client.addChannel(data.id, data.name);
		},
		removechannel: function(payload) {
			//remove from client.rooms
			client.removeChannel(payload);
		},
    };

    function Network() {
        this.buffer = [];
        this.socket = null;

        this.relay = '';
        this.ip = '';

        this._opened = false;
    }

    var proto = Network.prototype;
    proto.open = function (ip, onopen, onerror, onclose) {
        if (this._opened) {
            return;
        }

        this.socket = new WebSocket("ws://" + ip);
        this.ip = ip;
        this.relay = ip.substr(0, ip.lastIndexOf(":"));

        this._opened = true;
        this.socket.onopen = this.onopen(onopen);
        this.socket.onmessage = this.onmessage();
        if (typeof onerror === "function") {
            this.socket.onerror = onerror;
        }
        if (typeof onerror === "function") {
            this.socket.onclose = onclose;
        }
        return this;
    };

    proto.command = proto.send = function (command, payload) {
        this.sendRaw(transformers[command].call(this, payload));
        return this;
    };

    proto.sendRaw = function (msg) {
        if (!this.isOpen()) {
            this.buffer.push(msg);
            return this;
        }

        try {
            this.socket.send(msg);
        } catch (ex) {} // Ignore potential SYNTAX_ERRs
        return this;
    };

    proto.close = function () {
        if (!this.opened()) {
            return;
        }

        this.socket.close(1000);
        this.socket = null;
        this._opened = false;
        return this;
    };

    // State
    proto.opened = function () {
        var socket = this.socket;
        return socket && (socket.readyState === states.Connecting || socket.readyState === states.Open);
    };

    proto.isOpen = function () {
        var socket = this.socket;
        return socket && (socket.readyState === states.Open);
    };

    // Events
    proto.onopen = function (cb) {
        var net = this;

        return function () {
            var buffer = net.buffer,
                len = buffer.length,
                i;

            for (i = 0; i < len; i += 1) {
                net.sendRaw(buffer[i]);
            }

            if (typeof cb === "function") {
                cb.call(net, net);
            }
        };
    };

    proto.onmessage = function () {
        var net = this;
        return function (evt) {
            var data = evt.data,
                pipe = data.indexOf('|');

			console.log(data + "::" + pipe);

            if (pipe === -1) {
                console.error("Received raw message, should be changed in the relay station:", data);
                client.printRaw(data);
            } else {
                var e = data.substr(0, pipe),
                    payload = data.slice(pipe + 1);
                if (events.hasOwnProperty(e)) {
                    events[e].call(net, payload);
                } else {
					//console.log(data + "::" + pipe);
				}
            }
        };
    };

    Network.states = proto.states = states;
    Network.transformers = transformers;
    Network.events = events;

    window.Network = Network;
    window.network = new Network();
}(typeof MozWebSocket === 'function' ? MozWebSocket : WebSocket, client, JSON));