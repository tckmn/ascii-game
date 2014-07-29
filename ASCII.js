/**
 * Code for ascii-game
 * @author KeyboardFire
 * @license MIT
 */

/* TODO list
 * eliminate physics magic numbers (constants instead)
 * abstract into multiple files
 * scrolling!
 * a menu (low priority)
 */

/* BUGS list
 * When you walk off an edge, you float for a bit before you fall
 */

/* List of events
 * frame(self, deltaTime): called every frame
 * collision(self, other, direction): called when an object tries to move into another object
 */

/* Physics properties
 * positionX, positionY
 * velocityX, velocityY
 * gravity
 */

var ASCIIGame = {
	init: function(el, options) {
		if (!options) options = {};

		// game is the object that stores all the game-related information (data, internal metadata, player, etc.)
		var game = {
				// DOM
				el: el, elData: [], info: null,
				// internals
				data: [], eventData: {frame: []}, physicsData: [],
				w: options.w || options.width || 80,
				h: options.h || options.height || 24,
				player: null,
				lastFrame: 0,
				mainLoop: function() {
					var currentFrame = new Date();
					var deltaTime = Math.min(currentFrame - game.lastFrame, 500);
					game.lastFrame = currentFrame;
					// old was fixed 50ms per frame

					// handle player input
					game.player.physics.velocityX *= deltaTime * 0.01;
					if (tools.keysDown[65]) { // A (go left)
						game.player.physics.velocityX = Math.max(game.player.physics.velocityX - (deltaTime * 0.001), -1);
					}
					if (tools.keysDown[68]) { // D (go right)
						game.player.physics.velocityX = Math.min(game.player.physics.velocityX + (deltaTime * 0.001), 1);
					}
					if (tools.keysDown[87]) { // W (jump)
						// can't jump in midair
						if (data.get(game.player.x, game.player.y + 1).id !== 'empty') {
							game.player.physics.velocityY = -0.02;
							game.player.holdingJump = true;
						}
					} else if (game.player.holdingJump) {
						game.player.holdingJump = false;
						game.player.physics.velocityY = Math.max(game.player.physics.velocityY, -0.005);
					}

					// handle "each frame" events
					for (var i = 0; i < game.eventData.frame.length; ++i) {
						var c = tools.unpack(game.eventData.frame[i]), x = c[0], y = c[1];
						data.get(x, y).events.frame(data.get(x, y), deltaTime);
					}

					// handle physics
					for (var i = 0; i < game.physicsData.length; ++i) {
						var c = tools.unpack(game.physicsData[i]), x = c[0], y = c[1], d = data.get(x, y);
						d.physics.positionX += deltaTime * d.physics.velocityX;
						d.physics.positionY += deltaTime * d.physics.velocityY;
						if (d.physics.gravity) {
							if (data.get(x, y + 1).id === 'empty') d.physics.velocityY += deltaTime * d.physics.gravity;
							else {
								d.physics.velocityY = Math.min(d.physics.velocityY, 0);
							}
						}

						// update "real" coords if changed
						var newX = Math.round(d.physics.positionX), newY = Math.round(d.physics.positionY);
						if (x !== newX || y !== newY) {
							if (data.moveWithCollision(x, y, newX, newY)) {
								d.physics.positionX = d.x;
								d.physics.positionY = d.y;
							}
						}
						// this is really hacky
						if (d.physics.gravity && data.get(d.x, d.y + 1) !== 'empty') {
							data.collide(d, data.get(d.x, d.y + 1)); // force of gravity when standing on the ground
						}

						data.render();
					}

					tools.reqAnimFrame(game.mainLoop);
				}
			// tools stores all the stuff not directly related to the game (DOM tools, I/O, shims, algorithms, etc.)
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
				},
				// Bresenham's line algorithm (okay, fine, I don't understand a single bit of this)
				line: function(x1, y1, x2, y2) {
					var dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
					var sx = (x1 < x2) ? 1 : -1, sy = (y1 < y2) ? 1 : -1;
					var err = dx - dy;
					var points = [tools.pack(x1, y1)];

					while (x1 != x2 || y1 != y2) {
						var e2 = err * 2;
						if (e2 > -dy) {
							err -= dy;
							x1 += sx;
						}
						if (e2 < dx) {
							err += dx;
							y1 += sy;
						}
						points.push(tools.pack(x1, y1));
					}

					return points;
				}
			// data is a helper object to manipulate game.data and game.elData
			}, data = {
				// types of squares / tiles
				tile: function(type) {
					var o = ({
						empty: {color: '#000', chr: '.'},
						block: {color: '#F00', chr: '#'},
						// this is where the one and only player is initialize from, so special player attributes go here
						player: {color: '#00F', chr: '@', events: {
							// foo bar
						}, physics: {
							gravity: 0.00002
						}},
						goomba: {color: '#B73', chr: 'O', events: {
							collision: function(self, other, direction) {
								if (direction == tools.direction.UP) {
									data.set(self.x, self.y, data.tile('empty'));
								}
							}
						}, physics: {
							velocityX: -0.001,
							gravity: 0.00002
						}, counter: 0}
					})[type] || {};
					o.id = type;
					if (!o.events) o.events = {};
					return o;
				},
				get: function(x, y) {
					if (x < 0 || y < 0 || x >= game.data[0].length || y >= game.data.length) {
						return {id: 'outofbounds', events: {}};
					}
					return game.data[y][x];
				},
				set: function(x, y, val) {
					val.x = x;
					val.y = y;
					for (evtType in game.eventData) {
						if (game.data[y][x].events[evtType]) {
							game.eventData[evtType].splice(game.eventData[evtType].indexOf(tools.pack(x, y)), 1);
						}
						if (val.events[evtType]) {
							game.eventData[evtType].push(tools.pack(x, y));
						}

						if (game.data[y][x].physics) {
							game.physicsData.splice(game.physicsData.indexOf(tools.pack(x, y)), 1);
						}
						if (val.physics) {
							if (!val.physics.positionX) val.physics.positionX = x;
							if (!val.physics.positionY) val.physics.positionY = y;
							if (!val.physics.velocityX) val.physics.velocityX = 0;
							if (!val.physics.velocityY) val.physics.velocityY = 0;
							game.physicsData.push(tools.pack(x, y));
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
				collide: function(d1, d2) {
					var dx = d2.x - d1.x, dy = d2.y - d1.y,
						dir = Math.abs(dy) >= Math.abs(dx) ?
						(dy > 0 ? tools.direction.DOWN : tools.direction.UP) :
						(dx > 0 ? tools.direction.RIGHT : tools.direction.LEFT);

					if (d1.events.collision) {
						d1.events.collision(d1, d2, dir);
					}
					if (d2.events.collision) {
						d2.events.collision(d2, d1, -dir);
					}
				},
				// uses tools#line to stop on collision
				moveWithCollision: function(x1, y1, x2, y2) {
					var line = tools.line(x1, y1, x2, y2);
					var c = tools.unpack(line.shift()); // origin (x1, y1)
					x2 = c[0]; y2 = c[1]; // will be changed to x1/y1 in loop below

					while (line.length > 0) {
						c = tools.unpack(line.shift());
						x1 = x2; y1 = y2;
						x2 = c[0]; y2 = c[1];

						var d1 = data.get(x1, y1), d2 = data.get(x2, y2);
						if (d2.id === 'empty') {
							data.move(x1, y1, x2, y2);
						} else {
							data.collide(d1, d2);
							return true; // collided
						}
					}

					return false; // did not collide
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
				var _firsttime = true; // for finding charcodes quickly (should be removed later); exists due to laziness
				window.onkeydown = function(e) { if (_firsttime) console.log(e.which, e.keyCode); _firsttime = false; tools.keysDown[e.which || e.keyCode] = true; };
				window.onkeyup = function(e) { tools.keysDown[e.which || e.keyCode] = false; };

				// you!
				game.player = data.tile('player');
				data.set(1, game.h - 1, game.player);

				// a random wall (for testing)
				var wx = (Math.random() * (game.w-3) | 0) + 3;
				for (var i = 1; i < 6; ++i) data.set(wx, game.h - i, data.tile('block'));

				// a random goomba (also for testing)
				var gx = (Math.random() * (game.w-9) | 0) + 9;
				if (wx === gx) gx += (gx > game.w/2 ? 1 : -1);
				data.set(gx, game.h - 4, data.tile('goomba'));

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
