var ASCIIGame = {
	init: function(el, options) {
		if (!options) options = {};

		// game is the object that stores all the game-related information (data, internal metadata, player, etc.)
		var game = {
				el: el,
				data: [],
				elData: [],
                  playerName:document.getElementsByTagName('span')[0].innerHTML.replace('Enter your name and press Enter: ', ''),
				w: options.w || options.width || 80,
				h: options.h || options.height || 24,
				player: {jumpDeltas: [2, 2, 1, 2, 1, 1, 2, 1, 1, 0, 1, 1, 0, 1, 0, 0], jumpIndex: -1},
				lastFrame: 0,
				mainLoop: function() {
					// stuff that happens every frame
					if (new Date() - game.lastFrame > 50/*ms*/) {
						game.lastFrame = new Date();

						oldPlayerX = game.player.x, oldPlayerY = game.player.y;
						if (tools.keysDown[65]) { // A (go left)
							--game.player.x;
						}
						if (tools.keysDown[68]) { // D (go right)
							++game.player.x;
						}
						if (tools.keysDown[87] && game.player.jumpIndex == -1) { // W (jump)
							game.player.jumpIndex = 0;
						}
						if (game.player.jumpIndex != -1) { // jumping
							game.player.y -= game.player.jumpDeltas[game.player.jumpIndex++];
							if (game.player.jumpIndex >= game.player.jumpDeltas.length) game.player.jumpIndex = -1;
						}
						if (game.player.y != game.h - 1) { // gravity
							++game.player.y;
						}
						if ((oldPlayerX != game.player.x) || (oldPlayerY != game.player.y)) {
							data.move(oldPlayerX)(oldPlayerY)(game.player.x)(game.player.y);
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
				keysDown: {}
			// data is a helper object to manipulate game.data and game.elData
			}, data = {
				// special squares
				s: {
					EMPTY: {color: '#000', chr: '.'},
					PLAYER: {color: '#00F', chr: '@'}
				},
				get: function(x) {
					return function(y) {
						return game.data[y][x];
					};
				},
				set: function(x) {
					return function(y) {
						return function(val) {
							game.data[y][x] = val;
							data.modified.push({x: x, y: y});
						}
					}
				},
				move: function(x1) {
					return function(y1) {
						return function(x2) {
							return function(y2) {
								var old = data.get(x1)(y1);
								data.set(x1)(y1)(data.s.EMPTY);
								data.set(x2)(y2)(old);
							};
						};
					};
				},
				// render and modified exist so that the whole DOM doesn't have to be updated each frame
				render: function() {
					for (var i = 0; i < data.modified.length; ++i) {
						var c = data.modified[i];
						game.elData[c.y][c.x].style.color = game.data[c.y][c.x].color;
						game.elData[c.y][c.x].firstChild.nodeValue = game.data[c.y][c.x].chr;
					}
					data.modified = [];
				},
				modified: []
			};

		// this is the only object from init that will be exposed to outsiders
		var asciiGame = {
			play: function() {
                  // remove name choosing span
                  document.body.removeChild(document.getElementsByTagName('span')[0]);
                  
				// clear loading message, etc.
				while (game.el.firstChild) game.el.removeChild(game.el.firstChild);

				// set up / initialize internal data and DOM
				for (var y = 0; y < game.h; ++y) {
					var row = [];
					var elRow = [];
					for (var x = 0; x < game.w; ++x) {
						row.push(data.s.EMPTY);

						var node = document.createElement('span');
                           node.style.color = data.s.EMPTY.color;
						node.appendChild(document.createTextNode(data.s.EMPTY.chr));
						elRow.push(node);
						game.el.appendChild(node);
					}
					game.data.push(row);
					game.elData.push(elRow);
					game.el.appendChild(document.createTextNode('\n'));
				}

				// set up event listeners
				window.onkeydown = function(e) { console.log(e.which, e.keyCode); tools.keysDown[e.which || e.keyCode] = true; };
				window.onkeyup = function(e) { tools.keysDown[e.which || e.keyCode] = false; };

				// you!
				game.player.x = 1;
				game.player.y = game.h - 1;
				data.set(game.player.x)(game.player.y)(data.s.PLAYER);

				// start playing!
				game.mainLoop();
			}
		};
		return asciiGame;
	}
}

window.onload = function() {
    //Create span that everything appears on
    
    document.getElementById('ascii').innerHTML='';
    
    var node = document.createElement('span');
    document.body.appendChild(node);
    
    node.appendChild(document.createTextNode('Enter your name and press Enter: '));
    
    window.addEventListener('keypress', nameHandler, false);
}

function nameHandler(e)
{
    switch(e.keyCode)
    {
        case 13:
        var asciiGame = ASCIIGame.init(document.getElementById('ascii'));
        asciiGame.play();
        
        window.removeEventListener('keypress', nameHandler, false);
        break;
        
        default:
        var node = document.getElementsByTagName('span')[0];
        node.appendChild(document.createTextNode(String.fromCharCode(e.keyCode)));
    }
}
