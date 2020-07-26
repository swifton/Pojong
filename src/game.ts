// TODO: 
// Make a progress bar for generating. 

function random_integer(min: number, max: number): number { // Including min, excluding max
	return (min + Math.floor(Math.random() * (max - min)));
}

interface Vector {
	x: number;
	y: number;
}

function mul(vec: Vector, scalar: number): Vector {
	return {x: vec.x * scalar, y: vec.y * scalar};
}

function sum(vec_1: Vector, vec_2: Vector): Vector {
	return {x: vec_1.x + vec_2.x, y: vec_1.y + vec_2.y};
}

function sub(vec_1: Vector, vec_2: Vector): Vector {
	return {x: vec_1.x - vec_2.x, y: vec_1.y - vec_2.y};
}

function dot(vec_1: Vector, vec_2: Vector): number {
    return vec_1.x * vec_2.x + vec_1.y * vec_2.y;
}

interface Edge {
	v1: Vector;
	v2: Vector;
}

interface Polygon_Template {
    vertices: Vector[];
}

interface Transformation {
    sin: number;
    cos: number;
    scale: number;
    dx: number;
    dy: number;
}

class Polygon {
    center: Vector;
    free: boolean = false;
    n_blocked_edges: number;
    
	constructor(public vertices: Vector[], public template_i: number) {
		this.center = {x: 0, y: 0}
        for (var vertex of vertices) {
            this.center = sum(this.center, vertex);
        }
        
        this.center.x /= vertices.length;
        this.center.y /= vertices.length;
	}
}

class Game_Graph {
    coordinates: Vector[];
    
    constructor (public positions: number[][], public turns: [number, number][], public dead_ends: boolean[]) {
        this.coordinates = [];
        
        let n_vertical = 0;
        let c_length = positions[0].length;
        for (let position_i = 0; position_i < positions.length; position_i += 1) {
            let position = positions[position_i];
            if (position.length < c_length) {
                n_vertical = 0;
                c_length = position.length;
            }
            
            this.coordinates.push({x: c_length + 5, y: n_vertical + 5});
            
            n_vertical += 1;
        }
    }
}

let main_canvas = <HTMLCanvasElement> document.getElementById('canvas');
let main_context = main_canvas.getContext('2d');

let unit_pix: number = 50;
let canvas_center = [0, 0];
let polygons: Polygon[] = [];
let initial_position: Polygon[] = [];
let undo_stack: Polygon[][] = [];
let initial_numbers = [26, 36, 50, 70, -1];
let initial_i = 1;
let custom_n_polygons = 40;
let show_number_notice = false;

let mouse_down_pos: number[];
let pan_offset_x: number = 0;
let pan_offset_y: number = 0;
let old_pan_offset_x: number = 0;
let old_pan_offset_y: number = 0;
let panned = false;

let mouse_world_coord: Vector = {x: 0, y: 0};
let hovered_polygon_i: number = undefined;
let selected_polygon_i: number = undefined;
let base_polygon: Polygon = undefined;
let to_add_type = 3;

let triangle_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                      {x: 0.5, y: Math.sqrt(3)/2}, 
                                                      {x: 1, y: 0}]};

let big_triangle_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                          {x: 0.5, y: Math.sqrt(3)/2}, 
                                                          {x: 1, y: 2*Math.sqrt(3)/2}, 
                                                          {x: 1.5, y: Math.sqrt(3)/2}, 
                                                          {x: 2, y: 0}, 
                                                          {x: 1, y: 0}]};

let square_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                    {x: 0, y: 1}, 
                                                    {x: 1, y: 1}, 
                                                    {x: 1, y: 0}]};

let hexagon_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                     {x: 0.5, y: Math.sqrt(3)/2}, 
                                                     {x: 1.5, y: Math.sqrt(3)/2}, 
                                                     {x: 2, y: 0}, 
                                                     {x: 1.5, y: -Math.sqrt(3)/2},
                                                     {x: 0.5, y: -Math.sqrt(3)/2}]};

let octagon_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                     {x: 0, y: 1}, 
                                                     {x: Math.sqrt(2) / 2, y: 1 + Math.sqrt(2) / 2}, 
                                                     {x: 1 + Math.sqrt(2) / 2, y: 1 + Math.sqrt(2) / 2}, 
                                                     {x: 1 + Math.sqrt(2), y: 1}, 
                                                     {x: 1 + Math.sqrt(2), y: 0}, 
                                                     {x: 1 + Math.sqrt(2) / 2, y: -Math.sqrt(2) / 2}, 
                                                     {x: Math.sqrt(2) / 2, y: -Math.sqrt(2) / 2}]};

let trapezoid_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                       {x: 0.5, y: Math.sqrt(3)/2}, 
                                                       {x: 1.5, y: Math.sqrt(3)/2}, 
                                                       {x: 2, y: 0},
                                                       {x: 1, y: 0}]};

let parallelogram_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                           {x: 0.5, y: Math.sqrt(3)/2}, 
                                                           {x: 1.5, y: Math.sqrt(3)/2}, 
                                                           {x: 2.5, y: Math.sqrt(3)/2}, 
                                                           {x: 2, y: 0},
                                                           {x: 1, y: 0}]};

let rhombus_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                     {x: 0.5, y: Math.sqrt(3)/2}, 
                                                     {x: 1.5, y: Math.sqrt(3)/2}, 
                                                     {x: 1, y: 0}]};

let antitriangle_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                          {x: 0.5, y: Math.sqrt(3)/2}, 
                                                          {x: 1.5, y: Math.sqrt(3)/2}, 
                                                          {x: 2, y: 0}, 
                                                          {x: 1.5, y: -Math.sqrt(3)/2},
                                                          {x: 1, y: 0}, 
                                                          {x: 0.5, y: -Math.sqrt(3)/2}]};

let antirhombus_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                         {x: 0.5, y: Math.sqrt(3)/2}, 
                                                         {x: 1.5, y: Math.sqrt(3)/2}, 
                                                         {x: 2, y: 0}, 
                                                         {x: 1.5, y: -Math.sqrt(3)/2},
                                                         {x: 1, y: 0}]};

//let templates = [triangle_template, square_template, hexagon_template, octagon_template];
//let templates = [triangle_template, rhombus_template, trapezoid_template];
let templates = [triangle_template, hexagon_template, rhombus_template, trapezoid_template, big_triangle_template, parallelogram_template, antirhombus_template];
let colors = ["red", "green", "orange", "cyan", "yellow", "blue", "magenta", "white", "black", "brown"];

function step() {
    render();
}

function canvas_to_world(canvas_point: Vector): Vector {
    let wx: number = (canvas_point.x - canvas_center[0]) / unit_pix;
    let wy: number = (canvas_point.y - canvas_center[1]) / unit_pix;
    return {x: wx, y: wy};
}

function world_to_canvas(world_point: Vector): Vector {
    let cx: number = world_point.x * unit_pix + canvas_center[0];
    let cy: number = world_point.y * unit_pix + canvas_center[1];
    return {x: cx, y: cy};
}

function draw_polygon(polygon: Polygon, color: string, alpha: number): void {
    main_context.strokeStyle = "black";
	main_context.fillStyle = color;
    main_context.globalAlpha = alpha;
    
    main_context.beginPath();
    
    // Move to the last vertex of the polygon
    let last_vx = polygon.vertices[polygon.vertices.length - 1];
    let last_vx_canvas = world_to_canvas(last_vx);
    main_context.moveTo(last_vx_canvas.x, last_vx_canvas.y);
    
    // Looping over vertices, drawing the edge to each vertex.
    for (let vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
        let vx_c = world_to_canvas(polygon.vertices[vx_i]);
        main_context.lineTo(vx_c.x, vx_c.y);
    }
    
    main_context.fill();
    main_context.stroke();
    
    main_context.globalAlpha = 1;
}

function draw_line(p1: Vector, p2: Vector, color: string) {
    main_context.strokeStyle = color;
    
    main_context.beginPath();
    let p_1c = world_to_canvas(p1);
    let p_2c = world_to_canvas(p2);
    
    main_context.moveTo(p_1c.x, p_1c.y);
    main_context.lineTo(p_2c.x, p_2c.y);
    main_context.stroke();
}

function draw_point(point: Vector, color: string) {
    main_context.fillStyle = color;
    main_context.beginPath();
    let canv_v = world_to_canvas(point);
    main_context.arc(canv_v.x, canv_v.y, 5, 0, 2 * Math.PI);
    main_context.fill();
}

function draw_label(point: Vector, text: string, color: string) {
    main_context.fillStyle = color;
    let p_canvas = world_to_canvas(point);
    main_context.beginPath();
    main_context.font = '20px Calibri';
    main_context.fillText(text, p_canvas.x, p_canvas.y);
    main_context.fill();
}

function draw_label_canvas(point: Vector, text: string, color: string) {
    main_context.fillStyle = color;
    main_context.beginPath();
    main_context.font = '20px Calibri';
    main_context.fillText(text, point.x, point.y);
    main_context.fill();
}

let ui_cursor: Vector;
let ui_mouse_up: boolean;
let ui_click_happened: boolean;
let ui_mouse_down: boolean;
let ui_mouse_position: Vector = {x: 0, y: 0};

function reset_ui_frame(): void {
    ui_cursor = {x: 20, y: 20};
    ui_click_happened = ui_mouse_up;
    ui_mouse_up = false;
}

let button_width = 150;
let button_height = 30;

function button_with_position(text: string, position: Vector) {
    let mouse_inside = 
        ui_mouse_position.x > position.x && 
        ui_mouse_position.x < position.x + button_width && 
        ui_mouse_position.y > position.y && 
        ui_mouse_position.y < position.y + button_height;
    
    if (mouse_inside) {
        if (ui_mouse_down) main_context.fillStyle = '#999999';
        else main_context.fillStyle = '#aaaaaa';
    }
    else main_context.fillStyle = '#777777';
    
    main_context.strokeStyle = 'black';
    main_context.beginPath();
    main_context.rect(position.x, position.y, button_width, button_height);
    main_context.fill();
    main_context.stroke();
    
    main_context.font = '20px Calibri';
    draw_label_canvas({x: position.x + button_width / 2 - main_context.measureText(text).width / 2, y: position.y + 22}, text, "blue");
    
    let pressed = false;
    if (ui_click_happened && mouse_inside) {
        ui_click_happened = false;
        pressed = true;
    }
    
    return pressed;
}

function button(text: string): boolean {
    ui_cursor.y += 10;
    let pressed = button_with_position(text, ui_cursor);
    ui_cursor.y += button_height;
    return pressed;
}

function show_rules() {
    let lines = ["Click two similar polygons to remove both.", 
                 "Only non-blocked polygons can be removed.", 
                 "Blocked polygons are shaded.", 
                 "You win when the board is empty.", 
                 "A polygon is blocked when at least half of its boundary", 
                 "is touched by other polygons."];
    
    main_context.fillStyle = '#889988';
    main_context.strokeStyle = 'black';
    main_context.font = '20px Calibri';
    
    let max_width = 0;
    for (let line of lines) {
        let line_width = main_context.measureText(line).width;
        if (max_width < line_width) max_width = line_width;
    }
    
    let rules_width = max_width + 40;
    let rules_height = 60 + 40 * lines.length + button_height * 2;
    
    main_context.beginPath();
    main_context.rect(main_canvas.width / 2 - rules_width / 2, main_canvas.height / 2 - rules_height / 2, rules_width, rules_height);
    main_context.fill();
    main_context.stroke();
    
    
    let start_y = main_canvas.height / 2 - rules_height / 2 + 60;
    let width: number;
    
    for (let line of lines) {
        width = main_context.measureText(line).width;
        draw_label_canvas({x: main_canvas.width / 2 - width / 2, y: start_y}, line, "black");
        if (line[line.length - 1] == ".") start_y += 40;
        else start_y += 20;
    }
    
    if (button_with_position("Ok", {x: main_canvas.width / 2 - button_width / 2, y: start_y})) ui_show_rules = false;
}

let ui_show_rules = false;
let ui_show_number_of_polygons = false;

function render() {
    reset_ui_frame();
    
    // Resizing the canvas to fit the whole window.
	main_canvas.width = window.innerWidth;
    main_canvas.height = window.innerHeight;
    // Clearing the canvas.
	main_context.fillStyle = '#333333';
    main_context.clearRect(0, 0, main_canvas.width, main_canvas.height);
    main_context.beginPath();
    main_context.rect(0, 0, main_canvas.width, main_canvas.height);
    main_context.closePath();
    main_context.fill();
    
	// Setting up canvas parameters that pertain to all drawing.
	main_context.globalAlpha = 1;
	main_context.lineWidth = 2;
	
	// Hadndling canvas panning (operated by dragging the mouse).
	canvas_center[0] = main_canvas.width / 2 + pan_offset_x + old_pan_offset_x;
	canvas_center[1] = main_canvas.height / 2 + pan_offset_y + old_pan_offset_y;
    
    let position_to_display: Polygon[];
    
    if (gg_position_to_display == undefined) position_to_display = polygons;
    else position_to_display = gg_position_to_display;
    
    // Drawing polygons
    for (let polygon_i = 0; polygon_i < position_to_display.length; polygon_i += 1) {
		let polygon = position_to_display[polygon_i];
        
        let alpha: number;
        if (polygon.free) alpha = 1;
        else alpha = 0.3;
        
        draw_polygon(polygon, colors[polygon.template_i], alpha);
        if (show_labels) draw_label(polygon.center, polygon_i.toString(), "orange");
    }
	
    if (hovered_polygon_i != undefined) draw_polygon(polygons[hovered_polygon_i], "gray", 0.8);
    if (selected_polygon_i != undefined) draw_polygon(polygons[selected_polygon_i], "gray", 0.8);
	
	// Visualizing the mouse position.
    //draw_point(mouse_world_coord, "red");
    
    // Visualizing the game graph, if any.
    if (game_graph != undefined) {
        for (let turn of game_graph.turns) {
            let p1 = game_graph.coordinates[turn[0]];
            let p2 = game_graph.coordinates[turn[1]];
            draw_line(p1, p2, "brown");
        }
        
        for (let point_i = 0; point_i < game_graph.coordinates.length; point_i += 1) {
            let point = game_graph.coordinates[point_i];
            let color: string;
            if (game_graph.dead_ends[point_i]) color = "black";
            else color = "orange";
            draw_point(point, color);
            // draw_label(point, point_i.toString(), "green");
        }
    }
    
    // Rendering UI and taking input.
	main_context.globalAlpha = 1;
	
    if (button("Rules")) ui_show_rules = true;
    if (button("Restart (R)")) restart();
    if (button("Undo (Z)")) undo();
    if (button("New Game")) {
        if (initial_numbers[initial_i] == -1) {
            custom_n_polygons = parseInt(prompt("Number of polygons:", custom_n_polygons.toString()));
        }
        show_number_notice = false;
        generate();
    }
    
    draw_label_canvas({x: ui_cursor.x, y: ui_cursor.y + button_height + 20}, "Number of polygons: ", "white");
    ui_cursor.y += button_height + 20;
    let n_polygons_button_label: string;
    if (initial_numbers[initial_i] == -1) n_polygons_button_label = "Custom";
    else n_polygons_button_label = initial_numbers[initial_i].toString();
    if (button(n_polygons_button_label)) {
        initial_i += 1;
        initial_i %= initial_numbers.length;
        show_number_notice = true;
    }
    
    if (show_number_notice) {
        if (initial_numbers[initial_i] != -1) {
            draw_label_canvas({x: ui_cursor.x, y: ui_cursor.y + button_height}, "The next game will be " + initial_numbers[initial_i].toString() + " polygons.", "white");
        }
        ui_cursor.y += button_height;
    }
    
    if (ui_show_rules) show_rules();
    
    if (polygons.length == 0) {
        draw_label_canvas({x: main_canvas.width / 2 - main_context.measureText("Victory!").width / 2, y: main_canvas.height / 2}, "Victory!", "green");
        if (button_with_position("New Game", {x: main_canvas.width / 2 - button_width / 2, y: main_canvas.height / 2 + 40})) {
            show_number_notice = false;
            generate();
        }
    }
}

function same_vertex(vertex_1: Vector, vertex_2: Vector): boolean {
    let threshold = 0.01;
    if (manhattan(vertex_1, vertex_2) < threshold) return true;
    return false;
}

// The Manhattan distance between two points.
function manhattan(pt1: Vector, pt2: Vector): number {
    return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}

function same_edge(edge_1: Edge, edge_2: Edge): boolean {
    let threshold = 0.01;
    
    if (manhattan(edge_1.v1, edge_2.v1) < threshold && manhattan(edge_1.v2, edge_2.v2) < threshold) return true;
    if (manhattan(edge_1.v1, edge_2.v2) < threshold && manhattan(edge_1.v2, edge_2.v1) < threshold) return true;
    return false;
}

function edges_intersect(edge_1: Edge, edge_2: Edge): boolean {
    let x1 = edge_1.v1.x;
    let y1 = edge_1.v1.y;
    let x2 = edge_1.v2.x;
    let y2 = edge_1.v2.y;
    
    let x3 = edge_2.v1.x;
    let y3 = edge_2.v1.y;
    let x4 = edge_2.v2.x;
    let y4 = edge_2.v2.y;
    
    let side1 = (x3 - x1) * (y1 - y2) - (x1 - x2) * (y3 - y1);
    let side2 = (x4 - x1) * (y1 - y2) - (x1 - x2) * (y4 - y1);
    
    let side3 = (x1 - x3) * (y3 - y4) - (x3 - x4) * (y1 - y3);
    let side4 = (x2 - x3) * (y3 - y4) - (x3 - x4) * (y2 - y3);
    
    return side1 * side2 < 0 && side3 * side4 < 0;
}

// Find a linear transformation that transforms edge_1 into edge_2
function find_transformation(edge_1: Edge, edge_2: Edge): Transformation {
    let xt1 = edge_1.v1.x;
    let yt1 = edge_1.v1.y;
    let xt2 = edge_1.v2.x;
    let yt2 = edge_1.v2.y;
    
    let xe1 = edge_2.v1.x;
    let ye1 = edge_2.v1.y;
    let xe2 = edge_2.v2.x;
    let ye2 = edge_2.v2.y;
    
    let len_t = euclid(edge_1.v1, edge_1.v2);
    let len_e = euclid(edge_2.v1, edge_2.v2);
    
    let sin_a_t = (yt2 - yt1) / len_t;
    let cos_a_t = (xt2 - xt1) / len_t;
    
    let sin_a_e = (ye2 - ye1) / len_e;
    let cos_a_e = (xe2 - xe1) / len_e;
    
    let sin_a = sin_a_e * cos_a_t - cos_a_e * sin_a_t;
    let cos_a = cos_a_e * cos_a_t + sin_a_e * sin_a_t;
    
    let result: Transformation = {sin: sin_a, cos: cos_a, scale: len_e / len_t, dx: 0, dy: 0};
    let intermediary_v1 = transform(edge_1.v1, result);
    result.dx = edge_2.v1.x - intermediary_v1.x;
    result.dy = edge_2.v1.y - intermediary_v1.y;
    
    return result;
}

// Apply a linear transformation to a point.
function transform(point: Vector, transformation: Transformation): Vector {
    let x_new = transformation.scale * (point.x * transformation.cos - point.y * transformation.sin) + transformation.dx;
    let y_new = transformation.scale * (point.x * transformation.sin + point.y * transformation.cos) + transformation.dy;
    
    return {x: x_new, y: y_new};
}

// Tries to construct a polygon from a given template on the given edge, returns whether it was successful.
// starting_vx_i is the first vertex of the edge that needs to be matched.
function add_polygon(edge: Edge, base: Polygon, template_i: number) {
    let polygon_template = templates[template_i];
    let starting_vx_i = 0;
    if (starting_vx_i < 0 || starting_vx_i >= polygon_template.vertices.length) {
        console.log("ERROR: Invalid starting vertex index.");
        return false;
    }
    
    let threshold = 0.01;
    let starting_v1 = edge.v1;
    let starting_v2 = edge.v2;
    
    for (var polygon of polygons) {
        for (let vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
            let vx1 = polygon.vertices[vx_i];
            let vx2 = polygon.vertices[(vx_i + 1) % polygon.vertices.length];
            if (same_vertex(vx1, starting_v1) && same_vertex(vx2, starting_v2) && polygon != base) return false;
            if (same_vertex(vx1, starting_v2) && same_vertex(vx2, starting_v1) && polygon != base) return false;
        }
    }
    
    let polygon_vertices = [];
    let target_edge: Edge = {v1: starting_v2, v2: starting_v1};
    let first_template_edge: Edge = {v1: polygon_template.vertices[starting_vx_i], v2: polygon_template.vertices[(starting_vx_i + 1) % polygon_template.vertices.length]};
    
    if (Math.abs(euclid(first_template_edge.v1, first_template_edge.v2) - euclid(target_edge.v1, target_edge.v2)) > threshold) {
        console.log("ERROR: Can't glue together edges of different lengths.");
        return false;
    }
    
    let transformation = find_transformation(first_template_edge, target_edge);
    
    for (let vertex_i = 0; vertex_i < polygon_template.vertices.length; vertex_i += 1) {
        let p_vertex = transform(polygon_template.vertices[vertex_i], transformation);
        polygon_vertices.push(p_vertex);
    }
    
    // Checking that each vertex has enough space around it for the polygon.
    for (let vx_i = 1; vx_i < polygon_vertices.length; vx_i += 1) {
        let this_vx = polygon_vertices[vx_i];
        
        for (var that_polygon of polygons) {
            for (let that_vx_i = 0; that_vx_i < that_polygon.vertices.length; that_vx_i += 1) {
                let that_vx = that_polygon.vertices[that_vx_i];
                if (same_vertex(this_vx, that_vx)) {
                    let this_next = polygon_vertices[(vx_i + 1) % polygon_vertices.length];
                    let prev_i = vx_i - 1;
                    if (prev_i == -1) prev_i = polygon_vertices.length - 1;
                    let this_prev = polygon_vertices[prev_i];
                    
                    let that_next = that_polygon.vertices[(that_vx_i + 1) % that_polygon.vertices.length];
                    prev_i = that_vx_i - 1;
                    if (prev_i == -1) prev_i = that_polygon.vertices.length - 1;
                    let that_prev = that_polygon.vertices[prev_i];
                    
                    // This code checks that the new polygon won't intersect with old polygons. This code is difficult to understand, 
                    // maintain and debug. It should be replaced with something else.
                    if (point_is_on_inner_side(this_prev, this_vx, that_prev) && point_is_on_inner_side(this_vx, this_next, that_prev)) {
                        //console.log("Vertex collision 1"); 
                        
                        if (!same_vertex(this_prev, that_prev) && !same_vertex(this_next, that_prev)) return false;
                        //console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(this_prev, this_vx, that_next) && point_is_on_inner_side(this_vx, this_next, that_next)) {
                        //console.log("Vertex collision 2");
                        if (!same_vertex(this_prev, that_next) && !same_vertex(this_next, that_next)) return false;
                        //console.log("Exit prevented."); 
                    }
                    
                    if (point_is_on_inner_side(that_prev, that_vx, this_prev) && point_is_on_inner_side(that_vx, that_next, this_prev)) {
                        //console.log("Vertex collision 3"); 
                        if (!same_vertex(that_prev, this_prev) && !same_vertex(that_next, this_prev)) return false;
                        //console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(that_prev, that_vx, this_next) && point_is_on_inner_side(that_vx, that_next, this_next)) {
                        //console.log("Vertex collision 4"); 
                        if (!same_vertex(that_prev, this_next) && !same_vertex(that_next, this_next)) return false;
                        //console.log("Exit prevented."); 
                    }
                }
            }
        }
    }
    
    let new_polygon = new Polygon(polygon_vertices, template_i);
    
    // Checking that edges of the new polygon don't intersect with edges 
    // of existing polygons.
    for (let v1_i = 0; v1_i < new_polygon.vertices.length; v1_i += 1) {
        let v1 = new_polygon.vertices[v1_i];
        let v2 = new_polygon.vertices[(v1_i + 1) % new_polygon.vertices.length];
        let edge_to_check:Edge = {v1: v1, v2: v2};
        for (let polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
            let old_polygon = polygons[polygon_i];
            
            for (let v3_i = 0; v3_i < old_polygon.vertices.length; v3_i += 1) {
                let v3 = old_polygon.vertices[v3_i];
                let v4 = old_polygon.vertices[(v3_i + 1) % old_polygon.vertices.length];
                let old_edge_to_check: Edge = {v1: v3, v2: v4};
                if (edges_intersect(edge_to_check, old_edge_to_check)) {
                    //console.log("Polygon " + polygon_i + " is in the way.");
                    if (!same_vertex(edge_to_check.v1, old_edge_to_check.v1) && 
                        !same_vertex(edge_to_check.v1, old_edge_to_check.v2) && 
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v1) && 
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v2)) return false;
                    //console.log("Exit prevented."); 
                }
            }
        }
    }
    
    polygons.push(new_polygon);
    //console.log("Success!");
    return true;
}

function create_foam() {
    polygons = [];
    add_polygon(first_edge, undefined, 0);
    let tmp = first_edge.v1;
    first_edge.v1 = first_edge.v2;
    first_edge.v2 = tmp;
    add_polygon(first_edge, polygons[0], 0);
    
    let possible_templates: number[] = [];
    let budget = 4;
    for (let j = 0; j < budget; j += 1) {
        for (let i = 0; i < templates.length; i += 1) possible_templates.push(i);
    }
    
    let n_polygons_to_generate: number;
    if (initial_numbers[initial_i] == -1) n_polygons_to_generate = custom_n_polygons;
    else n_polygons_to_generate = initial_numbers[initial_i];
    
    while (polygons.length < n_polygons_to_generate) {
        //console.log(polygons.length);
        //let possible_i = random_integer(0, possible_templates.length);
        //let template_i = possible_templates[possible_i];
        
        let template_i = random_integer(0, templates.length);
        
        /*
        let possible_i = random_integer(0, possible_templates.length);
        let template_i = possible_templates[possible_i];
        for (let i = 0; i < templates.length; i += 1) {
            if (i != template_i) possible_templates.push(i);
        }
        */
        
        let old_length = polygons.length;
        // Find spots for two polygons of the same type
        let max_iterations = 100;
        while (polygons.length < old_length + 2) {
            max_iterations -= 1;
            if (max_iterations == 0) {
                if (polygons.length > old_length) polygons.splice(polygons.length - 1, 1);
                break;
            }
            
            let polygon_i = random_integer(0, polygons.length);
            let polygon = polygons[polygon_i];
            let vx_i = random_integer(0, polygon.vertices.length);
            let edge: Edge = {v1: polygon.vertices[vx_i], v2: polygon.vertices[(vx_i + 1) % polygon.vertices.length]};
            add_polygon(edge, polygons[polygon_i], template_i);
            update_polygon_freeness(polygons[polygons.length - 1], polygons);
            
            if (polygons.length > 10 && polygons[polygons.length - 1].n_blocked_edges == 1 && polygons[polygons.length - 1].template_i != 0 && polygons[polygons.length - 1].template_i != 2) polygons.splice(polygons.length - 1, 1);
        }
        
        if (max_iterations == 0) continue;
        
        // Check if both of them are free. If not, start over.
        update_polygon_freeness(polygons[polygons.length - 2], polygons);
        update_polygon_freeness(polygons[polygons.length - 1], polygons);
        if (!polygons[polygons.length - 1].free || !polygons[polygons.length - 2].free) {
            polygons.splice(polygons.length - 2, 2);
        } else {
            //possible_templates.splice(possible_i, 1);
        }
    }
    
    //console.log(polygons.length);
    
    update_polygons_freeness(polygons);
    
    initial_position = JSON.parse(JSON.stringify(polygons));
}

function update_polygon_freeness(polygon: Polygon, position: Polygon[]): void {
    let n_blocked_edges: number = 0;
    
    for (let vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
        for (let other_polygon of position) {
            if (other_polygon == polygon) continue;
            for (let other_vx_i = 0; other_vx_i < other_polygon.vertices.length; other_vx_i += 1) {
                let vx1 = polygon.vertices[vx_i];
                let vx2 = polygon.vertices[(vx_i + 1) % polygon.vertices.length];
                let other_vx1 = other_polygon.vertices[other_vx_i];
                let other_vx2 = other_polygon.vertices[(other_vx_i + 1) % other_polygon.vertices.length];
                
                if (same_edge({v1: vx1, v2: vx2}, {v1: other_vx1, v2: other_vx2})) {
                    n_blocked_edges += 1;
                }
            }
        }
    }
    
    polygon.n_blocked_edges = n_blocked_edges;
    if (n_blocked_edges < polygon.vertices.length - n_blocked_edges) polygon.free = true;
    else polygon.free = false;
}

function update_polygons_freeness(position: Polygon[]) {
    for (let polygon of position) {
        update_polygon_freeness(polygon, position);
    }
}

function mouse_down(x: number, y: number): void {
    mouse_is_down = true;
    mouse_down_pos = [x, y];
    panned = false;
}

function remove_by_value(array: any, element: any): void {
    for (let element_i = 0; element_i < array.length; element_i += 1) {
        if (array[element_i] == element) {
            array.splice(element_i, 1);
            return;
        }
    }
}

// Tests whether the point is on the line between two points. 
function point_is_on_line(vertex1: Vector, vertex2: Vector, point: Vector): boolean {
    let vec1: Vector = {x: vertex2.x - vertex1.x, y: vertex2.y - vertex1.y};
    let vec2: Vector = {x: point.x - vertex1.x, y: point.y - vertex1.y};
    
    let determinant = vec1.x * vec2.y - vec1.y * vec2.x;
    return Math.abs(determinant) < 0.01;
}

function mouse_up(x: number, y: number): void {
    mouse_is_down = false;
    
    old_pan_offset_x += pan_offset_x;
    old_pan_offset_y += pan_offset_y;
    if (Math.abs(pan_offset_x) + Math.abs(pan_offset_y) < 15) panned = false;
    
    pan_offset_x = 0;
    pan_offset_y = 0;
    
    // TODO: Make a sound system for determining who takes the click input.
    if (!panned) {
        if (selected_polygon_i == undefined && hovered_polygon_i != undefined) {
            selected_polygon_i = hovered_polygon_i;
        } else {
            if (hovered_polygon_i != undefined) {
                if (selected_polygon_i == hovered_polygon_i) {
                    hovered_polygon_i = undefined;
                    selected_polygon_i = undefined;
                } else if (polygons[selected_polygon_i].template_i == polygons[hovered_polygon_i].template_i) {
                    undo_stack.push(JSON.parse(JSON.stringify(polygons)));
                    
                    let polygon1_i = Math.min(selected_polygon_i, hovered_polygon_i);
                    let polygon2_i = Math.max(selected_polygon_i, hovered_polygon_i);
                    polygons.splice(polygon2_i, 1);
                    polygons.splice(polygon1_i, 1);
                    hovered_polygon_i = undefined;
                    selected_polygon_i = undefined;
                    update_polygons_freeness(polygons);
                }
            }
        }
    }
}

// Tests whether the point is on a certain side of the edge. This function only makes
// sense in the context of how polygons are constructed. 
function point_is_on_inner_side(vertex1: Vector, vertex2: Vector, point: Vector): boolean {
    let vec1: Vector = {x: vertex2.x - vertex1.x, y: vertex2.y - vertex1.y};
    let vec2: Vector = {x: point.x - vertex1.x, y: point.y - vertex1.y};
    
    let determinant = vec1.x * vec2.y - vec1.y * vec2.x;
    return determinant < 0;
}

function point_inside_polygon(point: Vector, polygon: Polygon): boolean {
    for (let vertex_i = 0; vertex_i < polygon.vertices.length; vertex_i += 1) {
        let vertex = polygon.vertices[vertex_i];
        let next_vertex = polygon.vertices[(vertex_i + 1) % polygon.vertices.length];
        
        if (!point_is_on_inner_side(vertex, next_vertex, point)) return false;
    }
    
    return true;
}

// The Euclid distance between two points.
function euclid(p1: Vector, p2: Vector):number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Assumes that v1 and v2 are different.
function distance_to_segment(v1: Vector, v2: Vector, p: Vector): number {
    let dir = sub(v2, v1);
    dir = mul(dir, 1/euclid(v1, v2));
    let to_project = sub(p, v1);
    
    // Make sure we don't go outside of the segment.
    let alpha = Math.max(0, Math.min(1, dot(dir, to_project)));
    let parallel = mul(dir, alpha);
    let perp = sub(to_project, parallel);
    return Math.sqrt(Math.pow(perp.x, 2) + Math.pow(perp.y, 2));
}

function mouse_move(x: number, y: number): void {
    ui_mouse_position = {x: x, y: y};
    
    if (mouse_is_down) {
        pan_offset_x = x - mouse_down_pos[0];
        pan_offset_y = y - mouse_down_pos[1];
        panned = true;
    }
    mouse_world_coord = canvas_to_world({x: x, y: y});
    
    // Hovering above a polygon?
    let found = false;
    for (let polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
        if (point_inside_polygon(mouse_world_coord, polygons[polygon_i]) && polygons[polygon_i].free) {
            hovered_polygon_i = polygon_i;
            found = true;
            break;
        }
    }
    
    if (!found) hovered_polygon_i = undefined;
    
    if (game_graph != undefined) {
        // gg_position_to_display = undefined;
        for (let vx_i = 0; vx_i < game_graph.positions.length; vx_i += 1) {
            if (euclid(mouse_world_coord, game_graph.coordinates[vx_i]) < 0.2) {
                let position_to_load = game_graph.positions[vx_i];
                gg_position_to_display = [];
                for (let index_i = 0; index_i < position_to_load.length; index_i += 1) {
                    gg_position_to_display.push(polygons[position_to_load[index_i]]);
                }
                update_polygons_freeness(gg_position_to_display);
                
                break;
            }
        }
    }
}

function mouse_scroll(direction: number): void {
    unit_pix += direction * 10;
}

function restart() {
    gg_position_to_display = undefined;
    polygons = JSON.parse(JSON.stringify(initial_position));
    undo_stack = [];
    selected_polygon_i = undefined;
}

function undo() {
    if (undo_stack.length > 0) {
        polygons = undo_stack.pop();
        selected_polygon_i = undefined;
    }
}

function q_down() {
    remove_random();
}

function e_down() {
    let solution = solve(polygons);
    console.log(solution);
}

function find_possible_pairs(position: Polygon[]): [number, number][] {
    let unblocked_polygons_i: number[] = [];
    let possible_pairs: [number, number][] = [];
    
    for (let polygon_i = 0; polygon_i < position.length; polygon_i += 1) {
        if (position[polygon_i].free) unblocked_polygons_i.push(polygon_i);
    }
    
    for (let polygon1_i = 0; polygon1_i < unblocked_polygons_i.length; polygon1_i += 1) {
        for (let polygon2_i = polygon1_i + 1; polygon2_i < unblocked_polygons_i.length; polygon2_i += 1) {
            if (position[unblocked_polygons_i[polygon1_i]].template_i == position[unblocked_polygons_i[polygon2_i]].template_i) {
                possible_pairs.push([unblocked_polygons_i[polygon1_i], unblocked_polygons_i[polygon2_i]]);
            }
        }
    }
    
    return possible_pairs;
}

function solve(position: Polygon[]): [number, number][] {
    let position_sequence: Polygon[][] = [position];
    let pair_indices: number[] = [];
    let possible_pair_sequence: [number, number][][] = []; // Possible pairs for each level
    
    possible_pair_sequence.push(find_possible_pairs(position));
    if (possible_pair_sequence[0].length == 0) return undefined;
    pair_indices.push(0);
    let level = 0;
    
    let n_turns = 0;
    
    let n_wins = 0;
    let n_stucks = 0;
    
    while (true) {
        //if (level == -1) return undefined;
        if (level == -1) break;
        
        //if (position_sequence[level].length == 1) break;
        
        update_polygons_freeness(position_sequence[level]);
        let n_blocked_polygons = 0;
        for (let p of position_sequence[level]) {
            if (!p.free) n_blocked_polygons += 1;
        }
        
        n_turns += 1;
        if (n_turns % 1000000 == 0) {
            let progress_string = "Progress ";
            progress_string += " | " + n_blocked_polygons.toString() + " | " + position_sequence[level].length.toString() + " | ";
            for (let index_i = 0; index_i < level; index_i += 1) {
                progress_string += pair_indices[index_i].toString() + "/" + possible_pair_sequence[index_i].length.toString() + ", ";
            }
            console.log("Turn # " + (n_turns/1000000).toString() + " million. " + progress_string);
        }
        
        if (pair_indices[level] == possible_pair_sequence[level].length || position_sequence[level].length == 1 || n_blocked_polygons == 0) {
            if (possible_pair_sequence[level].length == 0) n_stucks += 1;
            if (position_sequence[level].length == 1 || n_blocked_polygons == 0) n_wins += 1;
            
            level -= 1;
            pair_indices[level] += 1;
            
            continue;
        }
        
        let pair = possible_pair_sequence[level][pair_indices[level]];
        
        //let new_position = JSON.parse(JSON.stringify(position_sequence[level]));
        let new_position: Polygon[] = [];
        for (let polygon of position_sequence[level]) new_position.push(polygon);
        new_position.splice(pair[1], 1);
        new_position.splice(pair[0], 1);
        update_polygons_freeness(new_position);
        let new_pairs = find_possible_pairs(new_position);
        
        level += 1;
        
        if (possible_pair_sequence.length == level)  possible_pair_sequence.push(new_pairs);
        else possible_pair_sequence[level] = new_pairs;
        
        if (position_sequence.length == level) position_sequence.push(new_position);
        else position_sequence[level] = new_position;
        
        if (pair_indices.length == level) pair_indices.push(0);
        else pair_indices[level] = 0;
    }
    
    let ws_ratio = n_wins / n_stucks;
    console.log("Solved in " + n_turns.toString() + " turns. " + n_wins.toString() + " wins, " + n_stucks.toString() + " stucks. w/s ratio: " + ws_ratio.toString());
    
    let solution: [number, number][] = [];
    for (let turn_i = 0; turn_i < level; turn_i += 1) solution.push(possible_pair_sequence[turn_i][pair_indices[turn_i]]);
    
    return solution;
}

function generate_game_graph(position: Polygon[]): [number[][], [number, number][], boolean[]] {
    // Each position is represented by the list of inidces (in the original position) of polygons that are present.
    let positions: number[][] = [[]];
    let turns: [number, number][] = [];
    let dead_ends: boolean[] = [true];
    
    for (let polygon_i = 0; polygon_i < position.length; polygon_i += 1) positions[0].push(polygon_i);
    
    let position_i = 0;
    while (position_i < positions.length) {
        console.log(position_i, positions.length);
        
        let c_position: Polygon[] = [];
        for (let index_i = 0; index_i < positions[position_i].length; index_i += 1) {
            c_position.push(position[positions[position_i][index_i]]);
        }
        update_polygons_freeness(c_position);
        let possible_pairs = find_possible_pairs(c_position);
        
        if (possible_pairs.length > 0) dead_ends[position_i] = false;
        
        for (let pair of possible_pairs) {
            let new_position: number[] = [];
            for (let index_i = 0; index_i < positions[position_i].length; index_i += 1) {
                if (index_i != pair[0] && index_i != pair[1]) new_position.push(positions[position_i][index_i]);
            }
            
            let already_added = false;
            for (let candidate_i = position_i + 1; candidate_i < positions.length; candidate_i += 1 ) {
                let candidate = positions[candidate_i];
                let candidate_matches = false;
                
                if (candidate.length == new_position.length) {
                    candidate_matches = true;
                    for (let index_i = 0; index_i < candidate.length; index_i += 1) {
                        if (candidate[index_i] != new_position[index_i]) {
                            candidate_matches = false;
                            break;
                        }
                    }
                }
                
                if (candidate_matches) {
                    already_added = true;
                    turns.push([position_i, candidate_i]);
                    break;
                }
            }
            
            if (!already_added) {
                turns.push([position_i, positions.length]);
                positions.push(new_position);
                dead_ends.push(true);
            }
        }
        
        position_i += 1;
    }
    
    return [positions, turns, dead_ends];
}

function random_pass(initial_position: Polygon[]): boolean {
    let position = JSON.parse(JSON.stringify(initial_position));
    
    while (true) {
        update_polygons_freeness(position);
        
        let n_blocked_polygons = 0;
        for (let p of position) {
            if (!p.free) n_blocked_polygons += 1;
        }
        
        if (n_blocked_polygons == 0) return true;
        
        let pairs = find_possible_pairs(position);
        
        if (pairs.length == 0) return false;
        
        let pair = pairs[random_integer(0, pairs.length)];
        
        position.splice(pair[1], 1);
        position.splice(pair[0], 1);
    }
}

function remove_random() {
    let possible_pairs = find_possible_pairs(polygons);
    if (possible_pairs.length == 0) return;
    
    let pair_i = random_integer(0, possible_pairs.length);
    
    polygons.splice(possible_pairs[pair_i][1], 1);
    polygons.splice(possible_pairs[pair_i][0], 1);
}

if (templates.length > colors.length) console.log("ERROR: Not enough colors.");
let first_edge: Edge = {v1: {x: 0, y: 0}, v2: {x: 1, y: 0}};
//create_foam();

function w_down() {
    enough = true;
}

let n_iterations = 0;
let enough = false;

// Create a solitaire, solve it, repeat.
function test_1() {
    create_foam();
    
    n_iterations += 1;
    console.log("Round# " + n_iterations.toString() + ". " + polygons.length.toString() + " polygons.");
    
    let solution = solve(polygons);
    if (solution == undefined) {
        console.log("ERROR: No solution found!");
        return ;
    }
    polygons = [];
    if (enough) return;
    
    setTimeout(test_1, 1);
}

// Create a solitaire, make sure the number of polygons is odd. 
// (Otherwise it obviously can't be reduced to a single triangle)
function test_2() {
    create_foam();
    
    n_iterations += 1;
    console.log("Round# " + n_iterations.toString() + ". " + polygons.length.toString() + " polygons.");
    
    if (polygons.length % 2 == 0) {
        console.log("ERROR: Even number of polygons!");
        return;
    }
    
    
    polygons = [];
    setTimeout(test_2, 1);
}

function position_variation(position: Polygon[]): number {
    let frequencies: number[] = [];
    for (let t of templates) frequencies.push(0);
    
    for (let polygon of position) frequencies[polygon.template_i] += 1;
    console.log("frequencies");
    console.log(frequencies);
    
    let sum = 0;
    let sum_squares = 0;
    
    for (let frequency of frequencies) {
        sum += frequency;
        sum_squares += Math.pow(frequency, 2);
    }
    
    return sum_squares / frequencies.length - Math.pow(sum / frequencies.length, 2);
}

function test_current_position(): number {
    let n_wins = 0;
    let n_losses = 0;
    for (let pass_i = 0; pass_i < 1000; pass_i += 1) {
        let result = random_pass(polygons);
        if (result) n_wins += 1;
        else n_losses += 1;
    }
    let ratio = n_wins / n_losses;
    if (n_losses == 0) ratio = 1000;
    console.log("Wins: " + n_wins.toString() + ", losses: " + n_losses.toString() + ", ratio: " + ratio.toString());
    console.log("Variation in frequencies: " + position_variation(polygons).toString());
    return n_wins;
}

let sum_ratios = 0;
let sum_squares = 0;
function test_3() {
    while (true) {
        create_foam();
        
        n_iterations += 1;
        
        console.log("Round# " + n_iterations.toString() + ". " + polygons.length.toString() + " polygons.");
        
        let test_result = test_current_position();
        sum_ratios += test_result;
        sum_squares += Math.pow(test_result, 2);
        
        let mean = sum_ratios / n_iterations;
        let variance = sum_squares / n_iterations - Math.pow(mean, 2);
        console.log("Average wins: " + mean.toString());
        console.log("Variance of wins: " + variance.toString());
        
        polygons = [];
    }
}

let sum_var = 0;
let sum_sq_var = 0;
function test_4() {
    while (true) {
        create_foam();
        
        n_iterations += 1;
        
        console.log("Round# " + n_iterations.toString() + ". " + polygons.length.toString() + " polygons.");
        
        let test_result = position_variation(polygons);
        sum_var += test_result;
        sum_sq_var += Math.pow(test_result, 2);
        
        let mean = sum_var / n_iterations;
        let variance = sum_sq_var / n_iterations - Math.pow(mean, 2);
        console.log("Average variance: " + mean.toString());
        console.log("Variance of variances: " + variance.toString());
        
        polygons = [];
    }
}

let game_graph: Game_Graph = undefined;
let gg_position_to_display: Polygon[] = undefined;
function a_down() {
    let result = generate_game_graph(polygons);
    let positions  = result[0];
    let turns = result[1];
    let dead_ends = result[2];
    game_graph = new Game_Graph(positions, turns, dead_ends);
    
    test_current_position();
    
    let previous_template_i = undefined;
    let repetitions = 0;
    for (let polygon_i = 0; polygon_i < polygons.length; polygon_i += 2) {
        let polygon = polygons[polygon_i];
        if (previous_template_i == polygon.template_i) repetitions += 1;
        previous_template_i = polygon.template_i;
    }
    console.log("Repetitions: " + repetitions.toString());
}

function generate() {
    undo_stack = [];
    polygons = [];
    create_foam();
    game_graph = undefined;
    show_labels = false;
}

function d_down() {
    let position_to_display: Polygon[];
    
    if (gg_position_to_display == undefined) position_to_display = polygons;
    else position_to_display = gg_position_to_display;
    
    console.log(find_possible_pairs(position_to_display));
}

let show_labels = false;
function f_down() {
    show_labels = true;
}

function logo() {
    // [triangle_template, hexagon_template, rhombus_template, trapezoid_template, big_triangle_template, parallelogram_template, antirhombus_template];
    let edge: Edge = {v1: {x: 0, y: 0}, v2: {x: Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, undefined, 5);
    
    edge = {v2: {x: 0, y: 0}, v1: {x: Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, polygons[0], 5);
    
    edge = {v2: {x: Math.sqrt(3)/2 + .01, y: -.5}, v1: {x: Math.sqrt(3)/2 + 1.01, y: -.5}};
    add_polygon(edge, undefined, 6);
    
    edge = {v2: {x: Math.sqrt(3)/2 + 4.01, y: 1.5}, v1: {x: Math.sqrt(3)/2 + 5.01, y: 1.5}};
    add_polygon(edge, undefined, 6);
    
    edge = {v2: {x: Math.sqrt(3)/2 + 4.01, y: 0}, v1: {x: Math.sqrt(3)/2 + 3.01, y: 0}};
    add_polygon(edge, undefined, 6);
    
    
    edge = {v1: {x: 8, y: 0}, v2: {x: 8 + Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, undefined, 5);
    
    edge = {v2: {x: 8, y: 0}, v1: {x: 8 + Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, polygons[polygons.length - 1], 5);
    
    edge = {v1: {x: 8 - 0.01, y: 1}, v2: {x: 8 - 0.01, y: 2}};
    add_polygon(edge, polygons[polygons.length - 1], 2);
    
    edge = {v1: {x: 10 + 0.23, y: 0}, v2: {x: 10 + 0.23 + Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, undefined, 5);
    
    edge = {v1: {x: 12 - 0.01, y: 0.5}, v2: {x: 12 - 0.01, y: 1.5}};
    add_polygon(edge, polygons[polygons.length - 1], 2);
    
    edge = {v1: {x: 12, y: 0}, v2: {x: 12 + Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, undefined, 5);
    
    edge = {v1: {x: 16, y: 1}, v2: {x: 16, y: 2}};
    add_polygon(edge, polygons[polygons.length - 1], 3);
    
    edge = {v1: {x: 16, y: 0}, v2: {x: 16 + Math.sqrt(3)/2, y: - 1/2}};
    add_polygon(edge, undefined, 5);
    
    edge = {v2: {x: 12 + Math.sqrt(3)/2 + 4.01, y: -1.5}, v1: {x: 12 + Math.sqrt(3)/2 + 5.01, y: -1.5}};
    add_polygon(edge, undefined, 6);
    
    edge = {v2: {x: 12 + Math.sqrt(3)/2 + 4.01, y: -3}, v1: {x: 12 + Math.sqrt(3)/2 + 3.01, y: -3}};
    add_polygon(edge, undefined, 6);
    
    for (let polygon of polygons) polygon.free = true;
}

//test_3();
//test_4();

generate();
