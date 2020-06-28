"use strict";
function random_integer(min, max) {
    return (min + Math.floor(Math.random() * (max - min)));
}
function mul(vec, scalar) {
    return { x: vec.x * scalar, y: vec.y * scalar };
}
function sum(vec_1, vec_2) {
    return { x: vec_1.x + vec_2.x, y: vec_1.y + vec_2.y };
}
function sub(vec_1, vec_2) {
    return { x: vec_1.x - vec_2.x, y: vec_1.y - vec_2.y };
}
function dot(vec_1, vec_2) {
    return vec_1.x * vec_2.x + vec_1.y * vec_2.y;
}
var Polygon = /** @class */ (function () {
    function Polygon(vertices, template_i) {
        this.vertices = vertices;
        this.template_i = template_i;
        this.free = false;
        this.center = { x: 0, y: 0 };
        for (var _i = 0, vertices_1 = vertices; _i < vertices_1.length; _i++) {
            var vertex = vertices_1[_i];
            this.center = sum(this.center, vertex);
        }
        this.center.x /= vertices.length;
        this.center.y /= vertices.length;
    }
    return Polygon;
}());
var main_canvas = document.getElementById('canvas');
var main_context = main_canvas.getContext('2d');
var unit_pix = 50;
var canvas_center = [0, 0];
var polygons = [];
var mouse_down_pos;
var pan_offset_x = 0;
var pan_offset_y = 0;
var old_pan_offset_x = 0;
var old_pan_offset_y = 0;
var panned = false;
var mouse_world_coord = { x: 0, y: 0 };
var hovered_polygon_i = undefined;
var selected_polygon_i = undefined;
var base_polygon = undefined;
var to_add_type = 3;
var triangle_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1, y: 0 }] };
var big_triangle_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1, y: 2 * Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 },
        { x: 1, y: 0 }] };
var square_template = { vertices: [{ x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 }] };
var hexagon_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 },
        { x: 1.5, y: -Math.sqrt(3) / 2 },
        { x: 0.5, y: -Math.sqrt(3) / 2 }] };
var octagon_template = { vertices: [{ x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: Math.sqrt(2) / 2, y: 1 + Math.sqrt(2) / 2 },
        { x: 1 + Math.sqrt(2) / 2, y: 1 + Math.sqrt(2) / 2 },
        { x: 1 + Math.sqrt(2), y: 1 },
        { x: 1 + Math.sqrt(2), y: 0 },
        { x: 1 + Math.sqrt(2) / 2, y: -Math.sqrt(2) / 2 },
        { x: Math.sqrt(2) / 2, y: -Math.sqrt(2) / 2 }] };
var trapezoid_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 },
        { x: 1, y: 0 }] };
var parallelogram_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 },
        { x: 1, y: 0 }] };
var rhombus_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 1, y: 0 }] };
var antitriangle_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 },
        { x: 1.5, y: -Math.sqrt(3) / 2 },
        { x: 1, y: 0 },
        { x: 0.5, y: -Math.sqrt(3) / 2 }] };
var antirhombus_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 },
        { x: 1.5, y: -Math.sqrt(3) / 2 },
        { x: 1, y: 0 }] };
//let templates = [triangle_template, square_template, hexagon_template, octagon_template];
//let templates = [triangle_template, rhombus_template, trapezoid_template];
var templates = [triangle_template, hexagon_template, rhombus_template, trapezoid_template, big_triangle_template, parallelogram_template, antirhombus_template];
var colors = ["red", "green", "orange", "cyan", "yellow", "blue", "magenta", "white", "black", "brown"];
function step() {
    render();
}
function canvas_to_world(canvas_point) {
    var wx = (canvas_point.x - canvas_center[0]) / unit_pix;
    var wy = (canvas_point.y - canvas_center[1]) / unit_pix;
    return { x: wx, y: wy };
}
function world_to_canvas(world_point) {
    var cx = world_point.x * unit_pix + canvas_center[0];
    var cy = world_point.y * unit_pix + canvas_center[1];
    return { x: cx, y: cy };
}
function draw_polygon(polygon, color, alpha) {
    main_context.strokeStyle = "black";
    main_context.fillStyle = color;
    main_context.globalAlpha = alpha;
    main_context.beginPath();
    // Move to the last vertex of the polygon
    var last_vx = polygon.vertices[polygon.vertices.length - 1];
    var last_vx_canvas = world_to_canvas(last_vx);
    main_context.moveTo(last_vx_canvas.x, last_vx_canvas.y);
    // Looping over vertices, drawing the edge to each vertex.
    for (var vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
        var vx_c = world_to_canvas(polygon.vertices[vx_i]);
        main_context.lineTo(vx_c.x, vx_c.y);
    }
    main_context.fill();
    main_context.stroke();
    main_context.globalAlpha = 1;
}
function draw_edge(edge, color) {
    // Drawing the edge closest to the mouse
    main_context.strokeStyle = color;
    main_context.beginPath();
    var vx_1c = world_to_canvas(edge.v1);
    var vx_2c = world_to_canvas(edge.v2);
    main_context.moveTo(vx_1c.x, vx_1c.y);
    main_context.lineTo(vx_2c.x, vx_2c.y);
    main_context.stroke();
}
function draw_point(point, color) {
    main_context.fillStyle = color;
    main_context.beginPath();
    var canv_v = world_to_canvas(point);
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
    for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
        var polygon = polygons[polygon_i];
        var alpha = void 0;
        if (polygon.free)
            alpha = 1;
        else
            alpha = 0.3;
        draw_polygon(polygon, colors[polygon.template_i], alpha);
    }
    if (hovered_polygon_i != undefined)
        draw_polygon(polygons[hovered_polygon_i], "red", 1);
    if (selected_polygon_i != undefined)
        draw_polygon(polygons[selected_polygon_i], "red", 1);
    // Visualizing the mouse position.
    //draw_point(mouse_world_coord, "red");
}
function same_vertex(vertex_1, vertex_2) {
    var threshold = 0.01;
    if (manhattan(vertex_1, vertex_2) < threshold)
        return true;
    return false;
}
// The Manhattan distance between two points.
function manhattan(pt1, pt2) {
    return Math.abs(pt1.x - pt2.x) + Math.abs(pt1.y - pt2.y);
}
function same_edge(edge_1, edge_2) {
    var threshold = 0.01;
    if (manhattan(edge_1.v1, edge_2.v1) < threshold && manhattan(edge_1.v2, edge_2.v2) < threshold)
        return true;
    if (manhattan(edge_1.v1, edge_2.v2) < threshold && manhattan(edge_1.v2, edge_2.v1) < threshold)
        return true;
    return false;
}
function edges_intersect(edge_1, edge_2) {
    var x1 = edge_1.v1.x;
    var y1 = edge_1.v1.y;
    var x2 = edge_1.v2.x;
    var y2 = edge_1.v2.y;
    var x3 = edge_2.v1.x;
    var y3 = edge_2.v1.y;
    var x4 = edge_2.v2.x;
    var y4 = edge_2.v2.y;
    var side1 = (x3 - x1) * (y1 - y2) - (x1 - x2) * (y3 - y1);
    var side2 = (x4 - x1) * (y1 - y2) - (x1 - x2) * (y4 - y1);
    var side3 = (x1 - x3) * (y3 - y4) - (x3 - x4) * (y1 - y3);
    var side4 = (x2 - x3) * (y3 - y4) - (x3 - x4) * (y2 - y3);
    return side1 * side2 < 0 && side3 * side4 < 0;
}
// Find a linear transformation that transforms edge_1 into edge_2
function find_transformation(edge_1, edge_2) {
    var xt1 = edge_1.v1.x;
    var yt1 = edge_1.v1.y;
    var xt2 = edge_1.v2.x;
    var yt2 = edge_1.v2.y;
    var xe1 = edge_2.v1.x;
    var ye1 = edge_2.v1.y;
    var xe2 = edge_2.v2.x;
    var ye2 = edge_2.v2.y;
    var len_t = euclid(edge_1.v1, edge_1.v2);
    var len_e = euclid(edge_2.v1, edge_2.v2);
    var sin_a_t = (yt2 - yt1) / len_t;
    var cos_a_t = (xt2 - xt1) / len_t;
    var sin_a_e = (ye2 - ye1) / len_e;
    var cos_a_e = (xe2 - xe1) / len_e;
    var sin_a = sin_a_e * cos_a_t - cos_a_e * sin_a_t;
    var cos_a = cos_a_e * cos_a_t + sin_a_e * sin_a_t;
    var result = { sin: sin_a, cos: cos_a, scale: len_e / len_t, dx: 0, dy: 0 };
    var intermediary_v1 = transform(edge_1.v1, result);
    result.dx = edge_2.v1.x - intermediary_v1.x;
    result.dy = edge_2.v1.y - intermediary_v1.y;
    return result;
}
// Apply a linear transformation to a point.
function transform(point, transformation) {
    var x_new = transformation.scale * (point.x * transformation.cos - point.y * transformation.sin) + transformation.dx;
    var y_new = transformation.scale * (point.x * transformation.sin + point.y * transformation.cos) + transformation.dy;
    return { x: x_new, y: y_new };
}
// Tries to construct a polygon from a given template on the given edge, returns whether it was successful.
// starting_vx_i is the first vertex of the edge that needs to be matched.
function add_polygon(edge, base, template_i) {
    var polygon_template = templates[template_i];
    var starting_vx_i = 0;
    if (starting_vx_i < 0 || starting_vx_i >= polygon_template.vertices.length) {
        console.log("ERROR: Invalid starting vertex index.");
        return false;
    }
    var threshold = 0.01;
    var starting_v1 = edge.v1;
    var starting_v2 = edge.v2;
    for (var _i = 0, polygons_1 = polygons; _i < polygons_1.length; _i++) {
        var polygon = polygons_1[_i];
        for (var vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
            var vx1 = polygon.vertices[vx_i];
            var vx2 = polygon.vertices[(vx_i + 1) % polygon.vertices.length];
            if (same_vertex(vx1, starting_v1) && same_vertex(vx2, starting_v2) && polygon != base)
                return false;
            if (same_vertex(vx1, starting_v2) && same_vertex(vx2, starting_v1) && polygon != base)
                return false;
        }
    }
    var polygon_vertices = [];
    var target_edge = { v1: starting_v2, v2: starting_v1 };
    var first_template_edge = { v1: polygon_template.vertices[starting_vx_i], v2: polygon_template.vertices[(starting_vx_i + 1) % polygon_template.vertices.length] };
    if (Math.abs(euclid(first_template_edge.v1, first_template_edge.v2) - euclid(target_edge.v1, target_edge.v2)) > threshold) {
        console.log("ERROR: Can't glue together edges of different lengths.");
        return false;
    }
    var transformation = find_transformation(first_template_edge, target_edge);
    for (var vertex_i = 0; vertex_i < polygon_template.vertices.length; vertex_i += 1) {
        var p_vertex = transform(polygon_template.vertices[vertex_i], transformation);
        polygon_vertices.push(p_vertex);
    }
    // Checking that each vertex has enough space around it for the polygon.
    for (var vx_i = 1; vx_i < polygon_vertices.length; vx_i += 1) {
        var this_vx = polygon_vertices[vx_i];
        for (var _a = 0, polygons_2 = polygons; _a < polygons_2.length; _a++) {
            var that_polygon = polygons_2[_a];
            for (var that_vx_i = 0; that_vx_i < that_polygon.vertices.length; that_vx_i += 1) {
                var that_vx = that_polygon.vertices[that_vx_i];
                if (same_vertex(this_vx, that_vx)) {
                    var this_next = polygon_vertices[(vx_i + 1) % polygon_vertices.length];
                    var prev_i = vx_i - 1;
                    if (prev_i == -1)
                        prev_i = polygon_vertices.length - 1;
                    var this_prev = polygon_vertices[prev_i];
                    var that_next = that_polygon.vertices[(that_vx_i + 1) % that_polygon.vertices.length];
                    prev_i = that_vx_i - 1;
                    if (prev_i == -1)
                        prev_i = that_polygon.vertices.length - 1;
                    var that_prev = that_polygon.vertices[prev_i];
                    // This code checks that the new polygon won't intersect with old polygons. This code is difficult to understand, 
                    // maintain and debug. It should be replaced with something else.
                    if (point_is_on_inner_side(this_prev, this_vx, that_prev) && point_is_on_inner_side(this_vx, this_next, that_prev)) {
                        //console.log("Vertex collision 1"); 
                        if (!same_vertex(this_prev, that_prev) && !same_vertex(this_next, that_prev))
                            return false;
                        //console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(this_prev, this_vx, that_next) && point_is_on_inner_side(this_vx, this_next, that_next)) {
                        //console.log("Vertex collision 2");
                        if (!same_vertex(this_prev, that_next) && !same_vertex(this_next, that_next))
                            return false;
                        //console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(that_prev, that_vx, this_prev) && point_is_on_inner_side(that_vx, that_next, this_prev)) {
                        //console.log("Vertex collision 3"); 
                        if (!same_vertex(that_prev, this_prev) && !same_vertex(that_next, this_prev))
                            return false;
                        //console.log("Exit prevented."); 
                    }
                    if (point_is_on_inner_side(that_prev, that_vx, this_next) && point_is_on_inner_side(that_vx, that_next, this_next)) {
                        //console.log("Vertex collision 4"); 
                        if (!same_vertex(that_prev, this_next) && !same_vertex(that_next, this_next))
                            return false;
                        //console.log("Exit prevented."); 
                    }
                }
            }
        }
    }
    var new_polygon = new Polygon(polygon_vertices, template_i);
    // Checking that edges of the new polygon don't intersect with edges 
    // of existing polygons.
    for (var v1_i = 0; v1_i < new_polygon.vertices.length; v1_i += 1) {
        var v1 = new_polygon.vertices[v1_i];
        var v2 = new_polygon.vertices[(v1_i + 1) % new_polygon.vertices.length];
        var edge_to_check = { v1: v1, v2: v2 };
        for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
            var old_polygon = polygons[polygon_i];
            for (var v3_i = 0; v3_i < old_polygon.vertices.length; v3_i += 1) {
                var v3 = old_polygon.vertices[v3_i];
                var v4 = old_polygon.vertices[(v3_i + 1) % old_polygon.vertices.length];
                var old_edge_to_check = { v1: v3, v2: v4 };
                if (edges_intersect(edge_to_check, old_edge_to_check)) {
                    //console.log("Polygon " + polygon_i + " is in the way.");
                    if (!same_vertex(edge_to_check.v1, old_edge_to_check.v1) &&
                        !same_vertex(edge_to_check.v1, old_edge_to_check.v2) &&
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v1) &&
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v2))
                        return false;
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
    for (var i = 0; i < 50; i += 1) {
        var template_i = random_integer(0, templates.length);
        var old_length = polygons.length;
        // Find spots for two polygons of the same type
        while (polygons.length < old_length + 2) {
            var polygon_i = random_integer(0, polygons.length);
            var polygon = polygons[polygon_i];
            var vx_i = random_integer(0, polygon.vertices.length);
            var edge = { v1: polygon.vertices[vx_i], v2: polygon.vertices[(vx_i + 1) % polygon.vertices.length] };
            add_polygon(edge, polygons[polygon_i], template_i);
            update_polygon_freeness(polygons[polygons.length - 1]);
            if (polygons.length > 10 && polygons[polygons.length - 1].n_blocked_edges == 1)
                polygons.splice(polygons.length - 1, 1);
        }
        // Check if both of them are free. If not, start over.
        update_polygon_freeness(polygons[polygons.length - 2]);
        update_polygon_freeness(polygons[polygons.length - 1]);
        if (!polygons[polygons.length - 1].free || !polygons[polygons.length - 2].free) {
            polygons.splice(polygons.length - 2, 2);
        }
    }
    update_polygons_freeness();
}
function update_polygon_freeness(polygon) {
    var n_blocked_edges = 0;
    for (var vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
        for (var _i = 0, polygons_3 = polygons; _i < polygons_3.length; _i++) {
            var other_polygon = polygons_3[_i];
            if (other_polygon == polygon)
                continue;
            for (var other_vx_i = 0; other_vx_i < other_polygon.vertices.length; other_vx_i += 1) {
                var vx1 = polygon.vertices[vx_i];
                var vx2 = polygon.vertices[(vx_i + 1) % polygon.vertices.length];
                var other_vx1 = other_polygon.vertices[other_vx_i];
                var other_vx2 = other_polygon.vertices[(other_vx_i + 1) % other_polygon.vertices.length];
                if (same_edge({ v1: vx1, v2: vx2 }, { v1: other_vx1, v2: other_vx2 })) {
                    n_blocked_edges += 1;
                }
            }
        }
    }
    polygon.n_blocked_edges = n_blocked_edges;
    if (n_blocked_edges < polygon.vertices.length - n_blocked_edges)
        polygon.free = true;
    else
        polygon.free = false;
}
function update_polygons_freeness() {
    for (var _i = 0, polygons_4 = polygons; _i < polygons_4.length; _i++) {
        var polygon = polygons_4[_i];
        update_polygon_freeness(polygon);
    }
}
function mouse_down(x, y) {
    mouse_is_down = true;
    mouse_down_pos = [x, y];
    panned = false;
}
function remove_by_value(array, element) {
    for (var element_i = 0; element_i < array.length; element_i += 1) {
        if (array[element_i] == element) {
            array.splice(element_i, 1);
            return;
        }
    }
}
// Tests whether the point is on the line between two points. 
function point_is_on_line(vertex1, vertex2, point) {
    var vec1 = { x: vertex2.x - vertex1.x, y: vertex2.y - vertex1.y };
    var vec2 = { x: point.x - vertex1.x, y: point.y - vertex1.y };
    var determinant = vec1.x * vec2.y - vec1.y * vec2.x;
    return Math.abs(determinant) < 0.01;
}
function mouse_up(x, y) {
    mouse_is_down = false;
    old_pan_offset_x += pan_offset_x;
    old_pan_offset_y += pan_offset_y;
    pan_offset_x = 0;
    pan_offset_y = 0;
    if (!panned) {
        if (selected_polygon_i == undefined) {
            selected_polygon_i = hovered_polygon_i;
        }
        else {
            if (selected_polygon_i == hovered_polygon_i) {
                hovered_polygon_i = undefined;
                selected_polygon_i = undefined;
            }
            else if (polygons[selected_polygon_i].template_i == polygons[hovered_polygon_i].template_i) {
                var polygon1_i = Math.min(selected_polygon_i, hovered_polygon_i);
                var polygon2_i = Math.max(selected_polygon_i, hovered_polygon_i);
                polygons.splice(polygon2_i, 1);
                polygons.splice(polygon1_i, 1);
                hovered_polygon_i = undefined;
                selected_polygon_i = undefined;
                update_polygons_freeness();
            }
        }
    }
}
// Tests whether the point is on a certain side of the edge. This function only makes
// sense in the context of how polygons are constructed. 
function point_is_on_inner_side(vertex1, vertex2, point) {
    var vec1 = { x: vertex2.x - vertex1.x, y: vertex2.y - vertex1.y };
    var vec2 = { x: point.x - vertex1.x, y: point.y - vertex1.y };
    var determinant = vec1.x * vec2.y - vec1.y * vec2.x;
    return determinant < 0;
}
function point_inside_polygon(point, polygon) {
    for (var vertex_i = 0; vertex_i < polygon.vertices.length; vertex_i += 1) {
        var vertex = polygon.vertices[vertex_i];
        var next_vertex = polygon.vertices[(vertex_i + 1) % polygon.vertices.length];
        if (!point_is_on_inner_side(vertex, next_vertex, point))
            return false;
    }
    return true;
}
// The Euclid distance between two points.
function euclid(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
// Assumes that v1 and v2 are different.
function distance_to_segment(v1, v2, p) {
    var dir = sub(v2, v1);
    dir = mul(dir, 1 / euclid(v1, v2));
    var to_project = sub(p, v1);
    // Make sure we don't go outside of the segment.
    var alpha = Math.max(0, Math.min(1, dot(dir, to_project)));
    var parallel = mul(dir, alpha);
    var perp = sub(to_project, parallel);
    return Math.sqrt(Math.pow(perp.x, 2) + Math.pow(perp.y, 2));
}
function mouse_move(x, y) {
    if (mouse_is_down) {
        pan_offset_x = x - mouse_down_pos[0];
        pan_offset_y = y - mouse_down_pos[1];
        panned = true;
    }
    mouse_world_coord = canvas_to_world({ x: x, y: y });
    // Hovering above a polygon?
    var found = false;
    for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
        if (point_inside_polygon(mouse_world_coord, polygons[polygon_i]) && polygons[polygon_i].free) {
            hovered_polygon_i = polygon_i;
            found = true;
            break;
        }
    }
    if (!found)
        hovered_polygon_i = undefined;
}
function space_down() {
}
function mouse_scroll(direction) {
    unit_pix += direction * 10;
}
var first_edge = { v1: { x: 0, y: 0 }, v2: { x: 1, y: 0 } };
create_foam();
if (templates.length > colors.length)
    console.log("ERROR: Not enough colors.");
