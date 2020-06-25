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
    
	constructor(public vertices: Vector[], public template_i: number) {
		this.center = {x: 0, y: 0}
        for (var vertex of vertices) {
            this.center = sum(this.center, vertex);
        }
        
        this.center.x /= vertices.length;
        this.center.y /= vertices.length;
	}
}

let main_canvas = <HTMLCanvasElement> document.getElementById('canvas');
let main_context = main_canvas.getContext('2d');

let unit_pix: number = 50;
let canvas_center = [0, 0];
let polygons: Polygon[] = [];

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

let triangle_template: Polygon_Template = {vertices: [{x: 0, y: 0}, {x: 0.5, y: Math.sqrt(3)/2}, {x: 1, y: 0}]};

let square_template: Polygon_Template = {vertices: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 0}]};

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

let prism_template: Polygon_Template = {vertices: [{x: 0, y: 0}, 
                                                   {x: 0.5, y: Math.sqrt(3)/2}, 
                                                   {x: 1.5, y: Math.sqrt(3)/2}, 
                                                   {x: 2, y: 0}]};

let rhombus_template: Polygon_Template = {vertices: [{x: 0, y: 0}, {x: 0.5, y: Math.sqrt(3)/2}, {x: 1.5, y: Math.sqrt(3)/2}, {x: 1, y: 0}]};

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
let templates = [triangle_template, hexagon_template, rhombus_template, prism_template, antirhombus_template];

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

function draw_edge(edge: Edge, color: string) {
    // Drawing the edge closest to the mouse
    main_context.strokeStyle = color;
    
    main_context.beginPath();
    let vx_1c = world_to_canvas(edge.v1);
    let vx_2c = world_to_canvas(edge.v2);
    
    main_context.moveTo(vx_1c.x, vx_1c.y);
    main_context.lineTo(vx_2c.x, vx_2c.y);
    main_context.stroke();
}

function draw_point(point: Vector, color: string) {
    main_context.fillStyle = color;
    main_context.beginPath();
    let canv_v = world_to_canvas(point);
    main_context.arc(canv_v.x, canv_v.y, 5, 0, 2 * Math.PI);
    main_context.fill();
}

function render() {
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
    
	// Hadndling canvas panning (operated by dragging the mouse).
	canvas_center[0] = main_canvas.width / 2 + pan_offset_x + old_pan_offset_x;
	canvas_center[1] = main_canvas.height / 2 + pan_offset_y + old_pan_offset_y;
    
	// Setting up canvas parameters that pertain to all drawing.
	main_context.globalAlpha = 1;
	main_context.lineWidth = 2;
	
	// Drawing polygons
	for (let polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
		let polygon = polygons[polygon_i];
        draw_polygon(polygon, "green", 1);
        
        /*
        // Visualizing and labeling the center of the polygon.
        main_context.fillStyle = "orange";
        main_context.beginPath();
        let canv_v = world_to_canvas(polygon.center);
        main_context.font = '10px serif';
        main_context.fillText(polygon_i.toString(), canv_v.x, canv_v.y);
        main_context.arc(canv_v.x, canv_v.y, 5, 0, 2 * Math.PI);
        main_context.fill();
        main_context.fillStyle = "green";
        */
    }
	
    if (hovered_polygon_i != undefined) draw_polygon(polygons[hovered_polygon_i], "red", 1);
    if (selected_polygon_i != undefined) draw_polygon(polygons[selected_polygon_i], "red", 1);
	
	// Visualizing the mouse position.
    //draw_point(mouse_world_coord, "red");
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
                        console.log("Vertex collision 1"); 
                        
                        if (!same_vertex(this_prev, that_prev) && !same_vertex(this_next, that_prev)) return false;
                        console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(this_prev, this_vx, that_next) && point_is_on_inner_side(this_vx, this_next, that_next)) {
                        console.log("Vertex collision 2");
                        if (!same_vertex(this_prev, that_next) && !same_vertex(this_next, that_next)) return false;
                        console.log("Exit prevented."); 
                    }
                    
                    if (point_is_on_inner_side(that_prev, that_vx, this_prev) && point_is_on_inner_side(that_vx, that_next, this_prev)) {
                        console.log("Vertex collision 3"); 
                        if (!same_vertex(that_prev, this_prev) && !same_vertex(that_next, this_prev)) return false;
                        console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(that_prev, that_vx, this_next) && point_is_on_inner_side(that_vx, that_next, this_next)) {
                        console.log("Vertex collision 4"); 
                        if (!same_vertex(that_prev, this_next) && !same_vertex(that_next, this_next)) return false;
                        console.log("Exit prevented."); 
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
                    console.log("Polygon " + polygon_i + " is in the way.");
                    if (!same_vertex(edge_to_check.v1, old_edge_to_check.v1) && 
                        !same_vertex(edge_to_check.v1, old_edge_to_check.v2) && 
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v1) && 
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v2)) return false;
                    console.log("Exit prevented."); 
                }
            }
        }
    }
    
    polygons.push(new_polygon);
    console.log("Success!");
    return true;
}

function create_foam() {
    polygons = [];
    add_polygon(first_edge, undefined, 0);
    
    for (let polygon_i = 0; polygon_i < 1000; polygon_i += 1) {
        let polygon_i = random_integer(0, polygons.length);
        let polygon = polygons[polygon_i].vertices;
        let vx_i = random_integer(0, polygon.length);
        let edge: Edge = {v1: polygon[vx_i], v2: polygon[(vx_i + 1) % polygon.length]};
        add_polygon(edge, polygons[polygon_i], random_integer(0, templates.length));
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
    pan_offset_x = 0;
    pan_offset_y = 0;
    
    if (!panned) {
        if (selected_polygon_i == undefined) {
            selected_polygon_i = hovered_polygon_i;
        } else {
            if (selected_polygon_i == hovered_polygon_i) {
                hovered_polygon_i = undefined;
                selected_polygon_i = undefined;
            } else if (polygons[selected_polygon_i].template_i == polygons[hovered_polygon_i].template_i) {
                polygons.splice(selected_polygon_i, 1);
                polygons.splice(hovered_polygon_i, 1);
                hovered_polygon_i = undefined;
                selected_polygon_i = undefined;
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
    if (mouse_is_down) {
        pan_offset_x = x - mouse_down_pos[0];
        pan_offset_y = y - mouse_down_pos[1];
        panned = true;
    }
    mouse_world_coord = canvas_to_world({x: x, y: y});
    
    // Hovering above a polygon?
    let found = false;
    for (let polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
        if (point_inside_polygon(mouse_world_coord, polygons[polygon_i])) {
            hovered_polygon_i = polygon_i;
            found = true;
            break;
        }
    }
    
    if (!found) hovered_polygon_i = undefined;
}

function space_down(): void {
    
}

function mouse_scroll(direction: number): void {
    unit_pix += direction * 10;
}

let first_edge: Edge = {v1: {x: 0, y: 0}, v2: {x: 1, y: 0}};
create_foam();
//add_polygon(first_edge, triangle_template);