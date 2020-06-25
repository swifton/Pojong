if (game_paused == undefined) var game_paused = false; // This clearly shouldn't work. But I never used it, so who knows.

function pause_game() {
  game_paused = !game_paused;
  // if (!game_paused) launch_game_loop();
}

function template_step() {
	step();
	requestAnimationFrame(template_step);
}

template_step();
