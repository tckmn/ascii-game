/**
 * Code for ascii-game
 * @author KeyboardFire
 * @license MIT
 */

var ASCIIGame = {
	init: function(el, options) {
		if (!options) options = {};

		// game is the object that stores all the game-related information (data, internal metadata, player, etc.)
		var game = {
				// DOM
				el: el, elData: [], info: null,
				// internals
				data: [], eventData: {frame: []},
				w: options.w || options.width || 80,
				h: options.h || options.height || 24,
				player: null,
				lastFrame: 0,
				mainLoop: function() {
					// stuff that happens every frame
					if (new Date() - game.lastFrame > 50/*ms*/) {
						game.lastFrame = new Date();

						// handle player input
						if (tools.keysDown[65]) { // A (go left)
							data.moveWithCollision(game.player.x, game.player.y, game.player.x - 1, game.player.y);
						}
						if (tools.keysDown[68]) { // D (go right)
							data.moveWithCollision(game.player.x, game.player.y, game.player.x + 1, game.player.y);
						}
						if (tools.keysDown[87]) { // W (jump)
							if (data.get(game.player.x, game.player.y + 1).id !== 'empty') {
								game.player.jumpIndex = 0;
							}
						}
						if (game.player.jumpIndex !== -1) { // jumping
							var dy = game.player.jumpDeltas[game.player.jumpIndex++];
							if (data.get(game.player.x, game.player.y - dy).id === 'empty') {
								data.move(game.player.x, game.player.y, game.player.x, game.player.y - dy);
							}
							if (game.player.jumpIndex >= game.player.jumpDeltas.length) game.player.jumpIndex = -1;
						}
						if (game.player.y < game.h - 1) { // gravity
							data.moveWithCollision(game.player.x, game.player.y, game.player.x, game.player.y + 1);
						}

						// handle "each frame" events
						for (var i = 0; i < game.eventData.frame.length; ++i) {
							var c = tools.unpack(game.eventData.frame[i]), x = c[0], y = c[1];
							data.get(x, y).events.frame(data.get(x, y));
						}

						data.render();
					}

					tools.reqAnimFrame(game.mainLoop);
				}
			// tools stores all the stuff not directly related to the game (DOM tools, I/O, shims, etc.)
			}, tools = {
				// simple requestAnimationFrame shim
				reqAnimFrame: function(f){window.requestAnimationFrame(f);} ||
					function(f){window.webkitRequestAnimationFrame(f);} ||
					function(f){window.mozRequestAnimationFrame(f);} ||
					function(f){window.msRequestAnimationFrame(f);} ||
					function(f){window.oRequestAnimationFrame(f);} ||
					function(f){setTimeout(f, 5);},
				keysDown: {},
				// for packing X/Y coords into a single number
				// for both values, 0 <= v < pow(2, 16)
				pack: function(a, b) {
					return (a << 16) | b;
				},
				unpack: function(n) {
					return [(n >> 16) & 0xFFFF, n & 0xFFFF];
				},
				// helper constants
				direction: {
					RIGHT: 1, LEFT: -1, UP: 2, DOWN: -2
				}
			// data is a helper object to manipulate game.data and game.elData
			}, data = {
				// types of squares / tiles
				tile: function(type) {
					var o = ({
						empty: {color: '#000', chr: '.'},
						player: {color: '#00F', chr: '@', events: {
							// foo bar
						}, jumpDeltas: [2, 2, 2, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0], jumpIndex: -1},
						block: {color: '#F00', chr: '#'},
						goomba: {color: '#B73', chr: 'O', events: {
							frame: function(self) {
								if (++self.counter !== 4) return;
								self.counter = 0;
								if (data.get(self.x - 1, self.y).id === 'empty') {
									data.move(self.x, self.y, self.x - 1, self.y);
								}
							},
							collision: function(self, other, direction) {
								if (direction == tools.direction.UP) {
									data.set(self.x, self.y, data.tile('empty'));
								}
							}
						}, counter: 0}
					})[type] || {};
					o.id = type;
					if (!o.events) o.events = {};
					return o;
				},
				get: function(x, y) {
					if (x < 0 || y < 0 || x >= game.data[0].length || y >= game.data.length) {
						return {id: 'outofbounds'};
					}
					return game.data[y][x];
				},
				set: function(x, y, val) {
					val.x = x;
					val.y = y;
					for (evtType in game.eventData) {
						if (game.data[y][x].events[evtType]) {
							game.eventData[evtType].splice(game.eventData[evtType].indexOf(tools.pack(x, y)));
						}
						if (val.events[evtType]) {
							game.eventData[evtType].push(tools.pack(x, y));
						}
					}
					game.data[y][x] = val;
					data.modified.push(tools.pack(x, y));
				},
				move: function(x1, y1, x2, y2) {
					var old = data.get(x1, y1);
					data.set(x1, y1, data.tile('empty'));
					data.set(x2, y2, old);
				},
				moveWithCollision: function(x1, y1, x2, y2) {
					var d1 = data.get(x1, y1), d2 = data.get(x2, y2);
					if (d2.id === 'empty') {
						data.move(x1, y1, x2, y2);
					} else {
						// this line of code is terrifying
						var dir = x1 < x2 ? tools.direction.RIGHT : (x1 > x2 ? tools.direction.LEFT : (y1 < y2 ? tools.direction.DOWN : tools.direction.UP));
						if (d1.events.collision) {
							d1.events.collision(d1, d2, dir);
						}
						if (d2.events.collision) {
							d2.events.collision(d2, d1, -dir);
						}
					}
				},
				// render and modified exist so that the whole DOM doesn't have to be updated each frame
				render: function() {
					for (var i = 0; i < data.modified.length; ++i) {
						var c = tools.unpack(data.modified[i]), x = c[0], y = c[1];
						game.elData[y][x].style.color = game.data[y][x].color;
						game.elData[y][x].firstChild.nodeValue = game.data[y][x].chr;
					}
					data.modified = [];
				},
				modified: []
			};

		// this is the only object from init that will be exposed to outsiders
		var asciiGame = {
			play: function() {
				// clear loading message, etc.
				while (game.el.firstChild) game.el.removeChild(game.el.firstChild);

				// set up / initialize internal data and DOM
				for (var y = 0; y < game.h; ++y) {
					var row = [];
					var elRow = [];
					for (var x = 0; x < game.w; ++x) {
						row.push(data.tile('empty'));

						var node = document.createElement('span');
						node.style.color = data.tile('empty').color;
						node.appendChild(document.createTextNode(data.tile('empty').chr));
						elRow.push(node);
						game.el.appendChild(node);
					}
					game.data.push(row);
					game.elData.push(elRow);
					game.el.appendChild(document.createTextNode('\n'));
				}

				// set up info display
				game.info = document.createElement('div');
				game.info.appendChild(document.createTextNode('info goes here'));
				game.el.appendChild(document.createTextNode('\n'));
				game.el.appendChild(game.info);

				// set up event listeners
				var _firsttime = true;
				window.onkeydown = function(e) { if (_firsttime) console.log(e.which, e.keyCode); _firsttime = false; tools.keysDown[e.which || e.keyCode] = true; };
				window.onkeyup = function(e) { tools.keysDown[e.which || e.keyCode] = false; };

				// you!
				game.player = data.tile('player');
				data.set(1, game.h - 1, game.player);

				// a random wall (for testing)
				var wx = (Math.random() * (game.w-3) | 0) + 3;
				for (var i = 1; i < 6; ++i) data.set(wx, game.h - i, data.tile('block'));

				// a random goomba (also for testing)
				var gx = (Math.random() * (game.w-6) | 0) + 6;
				if (wx === gx) gx += (gx > game.w/2 ? 1 : -1);
				data.set(gx, game.h - 1, data.tile('goomba'));

				// start playing!
				data.render();
				game.mainLoop();
			}
		};
		return asciiGame;
	}
};

window.onload = function() {
	var asciiGame = ASCIIGame.init(document.getElementById('ascii'));
	asciiGame.play();
};
