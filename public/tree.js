'use strict';




// ************** Generate the tree diagram	 *****************
var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 1737 - margin.right - margin.left,
    height = 1050 - margin.top - margin.bottom;

var i = 0;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function (d) {
        return [d.y, d.x];
    });

var svg = d3.select("body").append("svg")
    .style("background", "#212121")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var p = new URLSearchParams(location.search);
// load the external data
d3.json(`http://localhost:3000/app/${p.get('app')}/${p.get('env')}`, function (error, root) {
    console.log(root);
    update(root, "neededBy");
    update(root,"needs");
});

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return "<div> Applikasjon: <span style='color:lightblue'>"+ d.application+"</span></div> " +
            "<div> Versjon: <span style='color:lightblue'>"+ d.version+"</span></span> " +
            "<div> Miljø: <span style='color:lightblue'>"+ d.environment+"</span></div>";
    })

var linktip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return d.target.resources
            .map(function (resource){
                return "<div> Alias: <span style='color:lightblue'>"+ resource.alias+"</span></div> " + "<div> Type: <span style='color:lightblue'>"+ resource.type+"</span></span> "
                })
            .join("<p> ");
    })

svg.call(tip);
svg.call(linktip);




function update(source, direction) {

    var root;

    tree.children(function(d){
        return d[direction];
    })
    // Compute the new tree layout.
    var nodes = tree.nodes(source),
        links = tree.links(nodes);

    // Normalize for fixed-depth.
    nodes.forEach(function (d) {
        if (direction === "neededBy"){
            d.y = (width/2) - (d.depth * 400);
        }else{
            d.y = (width/2) + (d.depth * 400);
        }
    });


    // Declare the nodes…
    var node = svg.selectAll("g.node")
        .data(nodes, function (d) {
            root = nodes[0];
            return d.id || (d.id = ++i);
        });

    function nodeType(d){
        return d.id == root.id ? "root" :  direction;
    
    }

    // Enter the nodes.
    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            console.log(d.application + " is " + nodeType(d));
            return "translate(" + d.y + "," + d.x + ")";
        });


    nodeEnter.append("path")
        .attr("d", d3.svg.symbol()
            .size( function(d) { return nodeType(d)==="root" ? 80*80 :  30*30 })
            .type( function(d) { return "circle"}))
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .attr("class", function(d){ return nodeType(d)})
        .on("click",  function(d){
            location.search=`app=${d.application}&env=${d.environment}`;
        });



    nodeEnter.append("text")
        .attr("dx", function (d) {
            if (nodeType(d)==="root"){
                return "0em";
            }else if (nodeType(d) === "neededBy"){
                return "-1.6em";
            }else{
                return "1.6em";
            }
        })
        .attr("dy", function (d) {
            if (nodeType(d)==="root"){
                return "-3.5em";
            }else{
                return "0.35em";
            }
        })
        .attr("text-anchor", function (d) {
            if (nodeType(d)==="root"){
                return "middle";
            }else if (nodeType(d) === "neededBy"){
                return "end"
            }else{
                return "start";
            }
        })
        .text(function (d) {
            return  d.application;
        })
        .style("fill", "#BEBEBE");


    // Declare the links…
    var link = svg.selectAll("path.link")
        .data(links, function (d) {
            return d.target.id;
        });


    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("refX", 11)
        .attr("refY", 2)
        .attr("class", "greenarrow")
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path").attr("d", "M 0, 0 V4 L4, 2 Z");


    svg.append("defs").append("marker")
        .attr("id", "rotatedarrowhead")
        .attr("refX", -7)
        .attr("refY", 1.8)
        .attr("class", "pinkarrow")
        .attr("markerWidth", 22)
        .attr("markerHeight", 22)
        .attr("orient", 0)
        .attr("transform", "translate(200 ,200)")
        .append("path").attr("d", "M 0,0 V4 L4, 2 Z");

    // Enter the links.
    link.enter().insert("path", "g")
        .attr("class", function(d){ return nodeType(d.target) + " lenke"})
        .attr("marker-end", function(d){
            return nodeType(d) === "needs" ? "url(#arrowhead)" :  "url(#rotatedarrowhead)";
        })
        .attr("d", diagonal);

    link.enter().append("path")
        .attr("d", d3.svg.symbol()
            .size( function(d) { return 25*25 })
            .type( function(d) { return "circle"}))
        .attr("transform", function (d) {
            return "translate(" +
                ((d.source.y + d.target.y)/2) + "," +
                ((d.source.x + d.target.x)/2) + ")"
        })
        .on('mouseover', linktip.show)
        .on('mouseout', linktip.hide)
        .style("fill", "#ccc")


    link.enter().append("text")
        .attr("dx", "-0.3em")
        .attr("dy", "0.3em")
        .attr("text-anchor", "left")
        .attr("transform", function (d) {
            return "translate(" +
                ((d.source.y + d.target.y)/2) + "," +
                ((d.source.x + d.target.x)/2) + ")"
        })
        .text(function (d) {
            return d.target.resources.length;
        })
        .on('mouseover', linktip.show)
        .on('mouseout', linktip.hide)
        .style("fill", "#000")
        .style("font-weight","bold")
        .style("font-size", "14px")
        .style("font-family", "sans-serif");


}