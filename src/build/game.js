"use strict";
// TODO: 
// 1. Handle the multiedge union case.
// 2. Replace edge matching with online check for collision detection
// 3. Make sure you can't hover over two things at the same time.
// 4. It looks like you can hover over an edge while being outside it on the line.
// 5. Zoom to the cursor like google maps.
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
    function Polygon(vertices) {
        this.vertices = vertices;
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
var unit_pix = 200;
var canvas_center = [0, 0];
var polygons = [];
var mouse_down_pos;
var pan_offset_x = 0;
var pan_offset_y = 0;
var old_pan_offset_x = 0;
var old_pan_offset_y = 0;
var panned = false;
var mouse_world_coord = { x: 0, y: 0 };
var hovered_polygon = undefined;
var hovered_vertex = undefined;
var hovered_edge = undefined;
var selected_vertex = undefined;
var closest_edge = undefined;
var base_polygon = undefined;
var to_add_type = 3;
var triangle_template = { vertices: [{ x: 0, y: 0 }, { x: 0.5, y: Math.sqrt(3) / 2 }, { x: 1, y: 0 }] };
var square_template = { vertices: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }] };
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
var prism_template = { vertices: [{ x: 0, y: 0 },
        { x: 0.5, y: Math.sqrt(3) / 2 },
        { x: 1.5, y: Math.sqrt(3) / 2 },
        { x: 2, y: 0 }] };
var rhombus_template = { vertices: [{ x: 0, y: 0 }, { x: 0.5, y: Math.sqrt(3) / 2 }, { x: 1.5, y: Math.sqrt(3) / 2 }, { x: 1, y: 0 }] };
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
var templates = [triangle_template, hexagon_template, rhombus_template, prism_template, antirhombus_template];
var current_template = triangle_template;
var candidate_polygon = undefined;
var candidate_edge_i = undefined;
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
    if (candidate_polygon != undefined)
        draw_polygon(candidate_polygon, "green", 0.5);
    if (hovered_polygon != undefined)
        draw_polygon(hovered_polygon, "red", 1);
    if (closest_edge != undefined)
        draw_edge(closest_edge, "cyan");
    if (hovered_edge != undefined)
        draw_edge(hovered_edge, "yellow");
    if (hovered_vertex != undefined)
        draw_point(hovered_vertex, "yellow");
    if (selected_vertex != undefined)
        draw_point(selected_vertex, "yellow");
    // Visualizing the mouse position.
    //draw_point(mouse_world_coord, "red");
    // Visualizing the line by which the polygons will be cut.
    if (hovered_vertex != undefined && selected_vertex != undefined)
        draw_edge({ v1: hovered_vertex, v2: selected_vertex }, "blue");
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
function create_candidate_polygon(edge, base, p_template, starting_vx_i) {
    if (starting_vx_i < 0 || starting_vx_i >= p_template.vertices.length) {
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
    var first_template_edge = { v1: p_template.vertices[starting_vx_i], v2: p_template.vertices[(starting_vx_i + 1) % p_template.vertices.length] };
    if (Math.abs(euclid(first_template_edge.v1, first_template_edge.v2) - euclid(target_edge.v1, target_edge.v2)) > threshold) {
        console.log("ERROR: Can't glue together edges of different lengths.");
        return false;
    }
    var transformation = find_transformation(first_template_edge, target_edge);
    for (var vertex_i = 0; vertex_i < p_template.vertices.length; vertex_i += 1) {
        var p_vertex = transform(p_template.vertices[vertex_i], transformation);
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
                        console.log("Vertex collision 1");
                        if (!same_vertex(this_prev, that_prev) && !same_vertex(this_next, that_prev))
                            return false;
                        console.log("Exit prevented.");
                    }
                    if (point_is_on_inner_side(this_prev, this_vx, that_next) && point_is_on_inner_side(this_vx, this_next, that_next)) {
                        console.log("Vertex collision 2");
                        if (!same_vertex(this_prev, that_next) && !same_vertex(this_next, that_next))
                            return false;
                        console.log("Exit prevented.");
                    }
                    if (point_is_on_inner_side(that_prev, that_vx, this_prev) && point_is_on_inner_side(that_vx, that_next, this_prev)) {
                        console.log("Vertex collision 3");
                        if (!same_vertex(that_prev, this_prev) && !same_vertex(that_next, this_prev))
                            return false;
                        console.log("Exit prevented.");
                    }
                    if (point_is_on_inner_side(that_prev, that_vx, this_next) && point_is_on_inner_side(that_vx, that_next, this_next)) {
                        console.log("Vertex collision 4");
                        if (!same_vertex(that_prev, this_next) && !same_vertex(that_next, this_next))
                            return false;
                        console.log("Exit prevented.");
                    }
                }
            }
        }
    }
    var new_polygon = new Polygon(polygon_vertices);
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
                    console.log("Polygon " + polygon_i + " is in the way.");
                    if (!same_vertex(edge_to_check.v1, old_edge_to_check.v1) &&
                        !same_vertex(edge_to_check.v1, old_edge_to_check.v2) &&
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v1) &&
                        !same_vertex(edge_to_check.v2, old_edge_to_check.v2))
                        return false;
                    console.log("Exit prevented.");
                }
            }
        }
    }
    candidate_polygon = new_polygon;
    console.log("Success!");
    return true;
}
function add_polygon(edge, base, p_template) {
    if (create_candidate_polygon(edge, base, p_template, 0)) {
        polygons.push(candidate_polygon);
        candidate_polygon = undefined;
    }
}
function create_foam() {
    polygons = [];
    add_polygon(first_edge, undefined, triangle_template);
    for (var polygon_i = 0; polygon_i < 1000; polygon_i += 1) {
        var polygon_i_1 = random_integer(0, polygons.length);
        var polygon = polygons[polygon_i_1].vertices;
        var vx_i = random_integer(0, polygon.length);
        var edge = { v1: polygon[vx_i], v2: polygon[(vx_i + 1) % polygon.length] };
        add_polygon(edge, polygons[polygon_i_1], templates[random_integer(0, templates.length)]);
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
// Finds the intersection of two segments. Assumes that they intersect. Run a check before calling this function.
function segment_intersection(v1, v2, v3, v4) {
    var threshold = 0.01;
    // Making a system of linear equations for alpha and beta -- parameters that parameterize the lines.
    var w1 = sub(v3, v4);
    var w2 = sub(v2, v1);
    var w3 = sub(v2, v4);
    var determinant = w1.x * w2.y - w1.y * w2.x;
    // Degenerate cases -- parallel segments and segments on the same line.
    if (Math.abs(determinant) < threshold)
        return { x: undefined, y: undefined };
    // Solving the system of linear equations.
    var alpha = (1 / determinant) * (w2.y * w3.x - w2.x * w3.y);
    var beta = (1 / determinant) * (-w1.y * w3.x + w1.x * w3.y);
    // The intersection has to be inside both segments.
    if (alpha > 1 - threshold || alpha < threshold)
        return { x: undefined, y: undefined };
    if (beta > 1 - threshold || beta < threshold)
        return { x: undefined, y: undefined };
    var new_vertex = sum(mul(v3, alpha), mul(v4, 1 - alpha));
    return new_vertex;
}
function cut_polygons() {
    var v1 = hovered_vertex;
    var v2 = selected_vertex;
    var w1 = sub(v1, v2);
    // Array of polygons that we will add.
    var polygons_vxs = [];
    for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
        var polygon = polygons[polygon_i];
        // Detecting whether we need to cut the polygon. And if we do, where to cut it.
        // The number is the index of the vertex where the polygon starts or ends.
        // The vector is an additonal vertex to add, if there is any (i.e. the line crosses an edge, and not a vertex).
        var starts = [];
        var ends = [];
        for (var vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
            var vx2_i = (vx_i + 1) % polygon.vertices.length;
            var vx1 = polygon.vertices[vx_i];
            var vx2 = polygon.vertices[vx2_i];
            var vx3 = polygon.vertices[(vx_i + 2) % polygon.vertices.length];
            if (point_is_on_line(v1, v2, vx2) && edges_intersect({ v1: v1, v2: v2 }, { v1: vx1, v2: vx3 })) {
                // The line enters or exits the polygon through a vertex.
                if (!point_is_on_line(v1, v2, vx1))
                    ends.push([vx2_i, undefined]);
                if (!point_is_on_line(v1, v2, vx3))
                    starts.push([vx2_i, undefined]);
            }
            else {
                // The line enters or exits the polygon through an edge.
                if (!point_is_on_line(v1, v2, vx1)) {
                    if (edges_intersect({ v1: v1, v2: v2 }, { v1: vx1, v2: vx2 })) {
                        var intersection = segment_intersection(v1, v2, vx1, vx2);
                        starts.push([vx2_i, intersection]);
                        ends.push([vx_i, intersection]);
                    }
                }
            }
        }
        if (starts.length == 0)
            continue;
        if (starts.length != ends.length) {
            console.log("ERROR: Different start and end lengths, " + starts.length.toString() + ", " + ends.length.toString());
            return;
        }
        // Constructing polygons according to the start/end markup we made.
        for (var loop_i = 0; loop_i < starts.length; loop_i += 1) {
            var start = starts[loop_i];
            var end = ends[(loop_i + 1) % ends.length];
            var c_polygon_vxs = [];
            // In case if the line enters or exits through an edge.
            if (end[1] != undefined)
                c_polygon_vxs.push(end[1]);
            if (start[1] != undefined)
                c_polygon_vxs.push(start[1]);
            // Adding the vertices.
            for (var vx_i = start[0]; vx_i != end[0]; vx_i = (vx_i + 1) % polygon.vertices.length) {
                c_polygon_vxs.push(polygon.vertices[vx_i]);
            }
            c_polygon_vxs.push(polygon.vertices[end[0]]);
            polygons_vxs.push(c_polygon_vxs);
        }
        polygons.splice(polygon_i, 1);
        polygon_i -= 1;
    }
    for (var _i = 0, polygons_vxs_1 = polygons_vxs; _i < polygons_vxs_1.length; _i++) {
        var vx_set = polygons_vxs_1[_i];
        polygons.push(new Polygon(vx_set));
    }
}
function mouse_up(x, y) {
    mouse_is_down = false;
    old_pan_offset_x += pan_offset_x;
    old_pan_offset_y += pan_offset_y;
    pan_offset_x = 0;
    pan_offset_y = 0;
    if (!panned) {
        if (hovered_vertex != undefined) {
            if (selected_vertex == undefined) {
                selected_vertex = hovered_vertex;
            }
            else {
                cut_polygons();
                selected_vertex = undefined;
                hovered_vertex = undefined;
            }
        }
        else if (hovered_edge != undefined) {
            var polygon1_i = undefined;
            var polygon2_i = undefined;
            var v1i = undefined;
            var v2i = undefined;
            for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
                var vxs = polygons[polygon_i].vertices;
                for (var vertex_i = 0; vertex_i < vxs.length; vertex_i += 1) {
                    var vx1 = vxs[vertex_i];
                    var vx2 = vxs[(vertex_i + 1) % vxs.length];
                    if (same_edge(hovered_edge, { v1: vx1, v2: vx2 })) {
                        if (polygon1_i == undefined) {
                            polygon1_i = polygon_i;
                            v1i = vertex_i;
                        }
                        else {
                            polygon2_i = polygon_i;
                            v2i = vertex_i;
                            break;
                        }
                    }
                }
                if (polygon2_i != undefined)
                    break;
            }
            if (polygon2_i != undefined)
                unite_polygons(polygon1_i, polygon2_i, v1i, v2i);
        }
        else {
            if (closest_edge != undefined) {
                if (candidate_polygon != undefined) {
                    polygons.push(candidate_polygon);
                    candidate_polygon = undefined;
                }
            }
            if (hovered_polygon != undefined) {
                for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
                    if (polygons[polygon_i] === hovered_polygon) {
                        polygons.splice(polygon_i, 1);
                        hovered_polygon = undefined;
                        break;
                    }
                }
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
// Takes indices of two polygons in the polygons array, gets rid of both, pushes their union. 
// Assumes that polygon1_i < polygon2_i.
function unite_polygons(polygon1_i, polygon2_i, v1i, v2i) {
    var p1 = polygons[polygon1_i];
    var p2 = polygons[polygon2_i];
    polygons.splice(polygon2_i, 1);
    polygons.splice(polygon1_i, 1);
    var new_polygon_vxs = [];
    for (var v_i = (v1i + 1) % p1.vertices.length; v_i != v1i; v_i = (v_i + 1) % p1.vertices.length) {
        new_polygon_vxs.push(p1.vertices[v_i]);
    }
    for (var v_i = (v2i + 1) % p2.vertices.length; v_i != v2i; v_i = (v_i + 1) % p2.vertices.length) {
        new_polygon_vxs.push(p2.vertices[v_i]);
    }
    if (point_is_on_line(new_polygon_vxs[p1.vertices.length], new_polygon_vxs[p1.vertices.length - 2], new_polygon_vxs[p1.vertices.length - 1])) {
        new_polygon_vxs.splice(p1.vertices.length - 1, 1);
    }
    if (point_is_on_line(new_polygon_vxs[new_polygon_vxs.length - 1], new_polygon_vxs[1], new_polygon_vxs[0])) {
        new_polygon_vxs.splice(0, 1);
    }
    polygons.push(new Polygon(new_polygon_vxs));
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
    var found_hovered_vertex = false;
    // This variable lets us keep the priorities: if we hover next to a vertex, we don't care about anything else.
    // If we hover next to an edge, we don't care about polygons and free edges.
    // If we hover over a polygon, we don't need to find a free edge to add a polygon to.
    var found = false;
    for (var polygon_i = 0; polygon_i < polygons.length; polygon_i += 1) {
        // Hovering next to a vertex?
        for (var _i = 0, _a = polygons[polygon_i].vertices; _i < _a.length; _i++) {
            var vertex = _a[_i];
            if (euclid(vertex, mouse_world_coord) < 10 / unit_pix) {
                hovered_vertex = vertex;
                hovered_edge = undefined;
                hovered_polygon = undefined;
                found_hovered_vertex = true;
                candidate_polygon = undefined;
                found = true;
                break;
            }
        }
        if (!found) {
            // Hovering next to an edge? 
            for (var vx_i = 0; vx_i < polygons[polygon_i].vertices.length; vx_i += 1) {
                var vertex_3 = polygons[polygon_i].vertices[vx_i];
                var vertex2 = polygons[polygon_i].vertices[(vx_i + 1) % polygons[polygon_i].vertices.length];
                if (distance_to_segment(vertex_3, vertex2, mouse_world_coord) < 10 / unit_pix) {
                    hovered_polygon = undefined;
                    hovered_edge = { v1: vertex_3, v2: vertex2 };
                    found = true;
                    break;
                }
            }
        }
        // Hovering above a polygon?
        if (!found && point_inside_polygon(mouse_world_coord, polygons[polygon_i])) {
            hovered_vertex = undefined;
            hovered_edge = undefined;
            hovered_polygon = polygons[polygon_i];
            closest_edge = undefined;
            found = true;
            candidate_polygon = undefined;
            break;
        }
    }
    if (!found) {
        // Find the closest edge to the cursor, so that we can add a polygon to it.
        hovered_polygon = undefined;
        hovered_vertex = undefined;
        hovered_edge = undefined;
        var min_dist = Number.MAX_VALUE;
        var new_edge = undefined;
        var new_base = undefined;
        for (var _b = 0, polygons_3 = polygons; _b < polygons_3.length; _b++) {
            var polygon = polygons_3[_b];
            for (var vx_i = 0; vx_i < polygon.vertices.length; vx_i += 1) {
                var dist = euclid(mouse_world_coord, polygon.vertices[vx_i]) + euclid(mouse_world_coord, polygon.vertices[(vx_i + 1) % polygon.vertices.length]);
                if (min_dist > dist) {
                    min_dist = dist;
                    new_edge = { v1: polygon.vertices[vx_i], v2: polygon.vertices[(vx_i + 1) % polygon.vertices.length] };
                    new_base = polygon;
                }
                // TODO: Check that the cursor projects onto the edge.
            }
        }
        if (closest_edge == undefined || !same_edge(new_edge, closest_edge) || candidate_polygon == undefined) {
            candidate_polygon = undefined;
            closest_edge = new_edge;
            base_polygon = new_base;
            for (candidate_edge_i = 0; candidate_edge_i < current_template.vertices.length; candidate_edge_i += 1) {
                if (create_candidate_polygon(closest_edge, base_polygon, current_template, candidate_edge_i))
                    break;
            }
        }
    }
    if (!found_hovered_vertex)
        hovered_vertex = undefined;
}
// Rotating the polygon clockwise
function e_down() {
    // If the candidate polygon is defined, then there is candidate_edge_i that works. 
    // Therefore, there will be no infiinte loop. Worst case: it makes a full circle, 
    // comes back to the current value and terminates.
    if (candidate_polygon == undefined)
        return;
    while (true) {
        candidate_edge_i += 1;
        if (candidate_edge_i == current_template.vertices.length)
            candidate_edge_i = 0;
        if (create_candidate_polygon(closest_edge, base_polygon, current_template, candidate_edge_i))
            break;
    }
}
// Rotating the polygon counter-clockwise
function q_down() {
    if (candidate_polygon == undefined)
        return;
    while (true) {
        candidate_edge_i -= 1;
        if (candidate_edge_i == -1)
            candidate_edge_i = current_template.vertices.length - 1;
        if (create_candidate_polygon(closest_edge, base_polygon, current_template, candidate_edge_i))
            break;
    }
}
function space_down() {
    if (hovered_polygon != undefined) {
        current_template = { vertices: hovered_polygon.vertices };
    }
}
function mouse_scroll(direction) {
    unit_pix += direction * 10;
}
var first_edge = { v1: { x: 0, y: 0 }, v2: { x: 1, y: 0 } };
create_foam();
//add_polygon(first_edge, triangle_template);
