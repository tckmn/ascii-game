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
				data: [], dynamicData: [],
				w: options.w || options.width || 80,
				h: options.h || options.height || 24,
				player: {jumpDeltas: [2, 2, 2, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0], jumpIndex: -1},
				lastFrame: 0,
				mainLoop: function() {
					// stuff that happens every frame
					if (new Date() - game.lastFrame > 50/*ms*/) {
						game.lastFrame = new Date();

						// handle player input
						if (tools.keysDown[65]) { // A (go left)
							if (data.get(game.player.x - 1, game.player.y).id === 'empty') {
								data.move(game.player.x, game.player.y, --game.player.x, game.player.y);
							}
						}
						if (tools.keysDown[68]) { // D (go right)
							if (data.get(game.player.x + 1, game.player.y).id === 'empty') {
								data.move(game.player.x, game.player.y, ++game.player.x, game.player.y);
							}
						}
						if (tools.keysDown[87]) { // W (jump)
							if (data.get(game.player.x, game.player.y + 1).id !== 'empty') {
								game.player.jumpIndex = 0;
							}
						}
						if (game.player.jumpIndex !== -1) { // jumping
							var dy = game.player.jumpDeltas[game.player.jumpIndex++];
							if (data.get(game.player.x, game.player.y - dy).id === 'empty') {
								data.move(game.player.x, game.player.y, game.player.x, game.player.y -= dy);
							}
							if (game.player.jumpIndex >= game.player.jumpDeltas.length) game.player.jumpIndex = -1;
						}
						if (game.player.y < game.h - 1) { // gravity
							if (data.get(game.player.x, game.player.y + 1).id === 'empty') {
								data.move(game.player.x, game.player.y, game.player.x, ++game.player.y);
							}
						}

						// handle dynamic tiles
						for (var i = 0; i < game.dynamicData.length; ++i) {
							var c = tools.unpack(game.dynamicData[i]), x = c[0], y = c[1];
							data.get(x, y).eachFrame(data.get(x, y), x, y);
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
				}
			// data is a helper object to manipulate game.data and game.elData
			}, data = {
				// types of squares / tiles
				tile: function(type) {
					var o = ({
						empty: {color: '#000', chr: '.'},
						player: {color: '#00F', chr: '@'},
						block: {color: '#F00', chr: '#'},
						goomba: {color: '#B73', chr: 'O', dynamic: true, eachFrame: function(self, x, y) {
							if (++self.counter !== 3) return;
							self.counter = 0;
							if (data.get(x - 1, y).id === 'empty') {
								data.move(x, y, x - 1, y);
							}
						}, counter: 0}
					})[type] || {};
					o.id = type;
					return o;
				},
				get: function(x, y) {
					if (x < 0 || y < 0 || x >= game.data[0].length || y >= game.data.length) {
						return {id: 'outofbounds'};
					}
					return game.data[y][x];
				},
				set: function(x, y, val) {
					if (game.data[y][x].dynamic) game.dynamicData.splice(game.dynamicData.indexOf(tools.pack(x, y)));
					if (val.dynamic) game.dynamicData.push(tools.pack(x, y));
					game.data[y][x] = val;
					data.modified.push(tools.pack(x, y));
				},
				move: function(x1, y1, x2, y2) {
					var old = data.get(x1, y1);
					data.set(x1, y1, data.tile('empty'));
					data.set(x2, y2, old);
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
				window.onkeydown = function(e) { console.log(e.which, e.keyCode); tools.keysDown[e.which || e.keyCode] = true; };
				window.onkeyup = function(e) { tools.keysDown[e.which || e.keyCode] = false; };

				// you!
				game.player.x = 1;
				game.player.y = game.h - 1;
				data.set(game.player.x, game.player.y, data.tile('player'));

				// a random wall (for testing)
				var wx = Math.random() * game.w | 0;
				for (var i = 1; i < 6; ++i) data.set(wx, game.h - i, data.tile('block'));

				// a random goomba (also for testing)
				var gx = Math.random() * game.w | 0;
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
